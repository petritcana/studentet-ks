"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { onAnswerAccepted } from "@/lib/competition/contributions";
import { requireParticipant } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { screen } from "@/lib/moderation";
import { awardActivityXp, rewardAnswerAccepted, touchStreak } from "@/lib/rewards";
import { shouldCountVote } from "@/lib/antiabuse";
import { NUDGE_AFTER_HOURS, NUDGE_RECIPIENTS } from "@/lib/constants";
import { fail, succeed, type ActionState } from "./types";

const askSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().trim().min(8).max(160),
  text: z.string().trim().min(10).max(4000),
});

export async function askQuestion(input: {
  courseId: string;
  title: string;
  text: string;
}): Promise<ActionState & { id?: string }> {
  const me = await requireParticipant();

  const limit = rateLimit("post", me.id);
  if (!limit.ok) return fail("errors.rateLimited");

  const parsed = askSchema.safeParse(input);
  if (!parsed.success) return fail("errors.generic");

  const verdict = await screen(`${parsed.data.title} ${parsed.data.text}`);
  if (!verdict.allowed) return fail(`guard.${verdict.category}`);

  const question = await db.question.create({
    data: {
      authorId: me.id,
      courseId: parsed.data.courseId,
      title: parsed.data.title,
      text: parsed.data.text,
    },
  });

  const classmates = await db.enrollment.findMany({
    where: { courseId: parsed.data.courseId, userId: { not: me.id } },
    select: { userId: true },
    take: 60,
  });

  for (const classmate of classmates) {
    await db.notification.create({
      data: {
        userId: classmate.userId,
        category: "academic",
        type: "question_new",
        actorId: me.id,
        targetId: question.id,
        targetType: "question",
        groupKey: `question:${parsed.data.courseId}`,
        payload: JSON.stringify({}),
      },
    });
  }

  await awardActivityXp(me.id, "post");
  await touchStreak(me.id);

  revalidatePath("/pyetje");
  return { ...succeed("question.sent"), id: question.id };
}

export async function answerQuestion(questionId: string, text: string): Promise<ActionState> {
  const me = await requireParticipant();

  const limit = rateLimit("comment", me.id);
  if (!limit.ok) return fail("errors.rateLimited");

  const trimmed = text.trim();
  if (trimmed.length < 10 || trimmed.length > 4000) return fail("errors.generic");

  const verdict = await screen(trimmed);
  if (!verdict.allowed) return fail(`guard.${verdict.category}`);

  const question = await db.question.findUnique({
    where: { id: questionId },
    select: { authorId: true },
  });
  if (!question) return fail("errors.notFoundContent");

  await db.answer.create({ data: { questionId, authorId: me.id, text: trimmed } });

  if (question.authorId !== me.id) {
    await db.notification.create({
      data: {
        userId: question.authorId,
        category: "academic",
        type: "answer_new",
        actorId: me.id,
        targetId: questionId,
        targetType: "question",
        payload: JSON.stringify({}),
      },
    });
  }

  await awardActivityXp(me.id, "comment");
  await touchStreak(me.id);

  revalidatePath(`/pyetje/${questionId}`);
  return succeed("question.answerSent");
}

/**
 * Pranimi i përgjigjes.
 *
 * Vetëm autori i pyetjes e pranon, dhe vetëm një herë. Shpërblimi (40 XP
 * kontributi dhe një ditë Pro) jepet te `rewardAnswerAccepted`, që është
 * idempotent përmes `rewardedAt`.
 */
export async function acceptAnswer(answerId: string): Promise<ActionState> {
  const me = await requireParticipant();

  const answer = await db.answer.findUnique({
    where: { id: answerId },
    select: {
      id: true,
      authorId: true,
      questionId: true,
      question: { select: { authorId: true, acceptedAnswerId: true } },
    },
  });
  if (!answer) return fail("errors.notFoundContent");
  if (answer.question.authorId !== me.id) return fail("errors.forbidden");
  if (answer.question.acceptedAnswerId) return fail("question.acceptedOnly");

  await db.question.update({
    where: { id: answer.questionId },
    data: { acceptedAnswerId: answerId },
  });

  await rewardAnswerAccepted(answerId);
  await onAnswerAccepted(answerId, answer.authorId, answer.question.authorId);

  revalidatePath(`/pyetje/${answer.questionId}`);
  return succeed("question.acceptedToast");
}

/** Vota është ndërruese dhe kurrë nuk vlen për përgjigjen tënde. */
export async function voteAnswer(answerId: string, value: 1 | -1): Promise<ActionState> {
  const me = await requireParticipant();

  const answer = await db.answer.findUnique({
    where: { id: answerId },
    select: { authorId: true, questionId: true },
  });
  if (!answer) return fail("errors.notFoundContent");

  const existing = await db.answerVote.findUnique({
    where: { answerId_userId: { answerId, userId: me.id } },
  });

  // Mbrojtja e ekonomise: vetevotimi, llogarite e reja dhe unazat e votimit
  // ndalen këtu, ne një vend te vetëm, jo te shperndara neper veprime.
  const reciprocal = await db.answerVote.count({
    where: { userId: answer.authorId, answer: { authorId: me.id } },
  });

  const verdict = shouldCountVote(
    {
      voterId: me.id,
      targetId: answer.authorId,
      voterAccountAgeDays: me.actor.accountAgeDays,
    },
    { reciprocalVotes: reciprocal },
  );

  // Vota e dyfishte lejohet: ajo është nderrim ose heqje, jo abuzim.
  if (!verdict.allowed && verdict.reason !== "duplicate") {
    return fail(`antiabuse.${verdict.reason}`);
  }

  if (existing?.value === value) {
    await db.answerVote.delete({ where: { id: existing.id } });
  } else if (existing) {
    await db.answerVote.update({ where: { id: existing.id }, data: { value } });
  } else {
    await db.answerVote.create({ data: { answerId, userId: me.id, value } });
  }

  const aggregate = await db.answerVote.aggregate({
    where: { answerId },
    _sum: { value: true },
  });

  await db.answer.update({
    where: { id: answerId },
    data: { votes: aggregate._sum.value ?? 0 },
  });

  revalidatePath(`/pyetje/${answer.questionId}`);
  return succeed();
}

export async function nudgeUnansweredQuestions(): Promise<ActionState & { nudged?: number }> {
  const cutoff = new Date(Date.now() - NUDGE_AFTER_HOURS * 3_600_000);

  const waiting = await db.question.findMany({
    where: {
      isHidden: false,
      nudgedAt: null,
      acceptedAnswerId: null,
      createdAt: { lt: cutoff },
      answers: { none: {} },
    },
    take: 20,
    select: { id: true, courseId: true, authorId: true },
  });

  let nudged = 0;

  for (const question of waiting) {
    // Ata që e kane marre lëndën dhe nuk janë vetë autori: gjenerata e kaluar.
    const veterans = await db.enrollment.findMany({
      where: {
        courseId: question.courseId,
        userId: { not: question.authorId },
        user: { verification: "verified" },
      },
      orderBy: { user: { xpContribution: "desc" } },
      take: NUDGE_RECIPIENTS,
      select: { userId: true },
    });

    for (const veteran of veterans) {
      await db.notification.create({
        data: {
          userId: veteran.userId,
          category: "academic",
          type: "question_waiting",
          targetId: question.id,
          targetType: "question",
          groupKey: `nudge:${question.id}`,
          payload: JSON.stringify({}),
        },
      });
    }

    await db.question.update({
      where: { id: question.id },
      data: { nudgedAt: new Date() },
    });
    nudged += veterans.length;
  }

  return { ...succeed(), nudged };
}
