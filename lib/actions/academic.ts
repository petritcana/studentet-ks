"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, serializeList } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { rateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { screen } from "@/lib/moderation";
import { awardXp, touchStreak } from "@/lib/xp";
import { MATERIAL_TYPES } from "@/lib/constants";
import {
  AUTO_HIDE_MIN_RATINGS,
  AUTO_HIDE_RATING,
  VERIFICATION_THRESHOLD,
} from "@/lib/quality";
import { fail, succeed, type ActionState } from "./types";


const materialSchema = z.object({
  courseId: z.string().min(1, "Zgjidh lëndën."),
  title: z.string().trim().min(6, "Titulli duhet të thotë çfarë është.").max(160),
  type: z.enum(MATERIAL_TYPES),
  academicYear: z.string().trim().min(4).max(12),
  professor: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  fileName: z.string().trim().min(1, "Zgjidh një skedar."),
  size: z.number().int().positive().max(25 * 1024 * 1024, "Provo një skedar nën 25MB."),
  pages: z.number().int().positive().max(2000).optional(),
  hasRights: z.literal(true, {
    message: "Konfirmo se materiali nuk shkel të drejta autoriale.",
  }),
});

export async function uploadMaterial(input: {
  courseId: string;
  title: string;
  type: string;
  academicYear: string;
  professor?: string;
  description?: string;
  fileName: string;
  size: number;
  pages?: number;
  hasRights: boolean;
}): Promise<ActionState & { materialId?: string }> {
  const me = await requireUser();

  const limit = rateLimit("upload", me.id);
  if (!limit.ok) return fail(rateLimitMessage(limit));

  const parsed = materialSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Materiali s'është i plotë.");
  }

  const verdict = await screen(`${parsed.data.title} ${parsed.data.description ?? ""}`);
  if (!verdict.allowed) return fail(verdict.message ?? "Ky tekst nuk kalon.");

  const course = await db.course.findUnique({
    where: { id: parsed.data.courseId },
    select: { id: true, name: true, professor: true },
  });
  if (!course) return fail("Kjo lëndë nuk u gjet.");

  const existingForCourse = await db.material.count({ where: { courseId: course.id } });

  const material = await db.material.create({
    data: {
      uploaderId: me.id,
      courseId: course.id,
      title: parsed.data.title,
      type: parsed.data.type,
      fileUrl: `/materialet/${course.id}/${Date.now()}-${parsed.data.fileName}`,
      mimeType: parsed.data.type === "video" ? "video/mp4" : "application/pdf",
      size: parsed.data.size,
      pages: parsed.data.pages ?? null,
      professor: parsed.data.professor || course.professor,
      academicYear: parsed.data.academicYear,
      description: parsed.data.description || null,
      verificationStatus: "pending",
    },
  });

  await db.post.create({
    data: {
      authorId: me.id,
      type: "material",
      text: `E ngarkova: ${material.title}. ${parsed.data.description ?? ""}`.trim(),
      courseId: course.id,
      facultyId: me.facultyId,
      materialId: material.id,
      media: serializeList([]),
    },
  });

  await awardXp(me.id, "materialUpload");
  await touchStreak(me.id);

  // Badge "I pari me material" kur lënda ishte bosh.
  if (existingForCourse === 0) {
    const badge = await db.badge.findUnique({ where: { code: "first_material" } });
    if (badge) {
      await db.userBadge
        .create({ data: { userId: me.id, badgeId: badge.id, context: course.name } })
        .catch(() => undefined);
    }
  }

  revalidatePath("/materialet");
  revalidatePath(`/lenda/${course.id}`);
  return { ...succeed("E ngarkove. +50 XP"), materialId: material.id };
}

export async function rateMaterial(
  materialId: string,
  value: number,
): Promise<ActionState> {
  const me = await requireUser();
  if (value < 1 || value > 5) return fail("Vlerëso me 1 deri 5 yje.");

  const material = await db.material.findUnique({
    where: { id: materialId },
    select: { uploaderId: true, verificationStatus: true },
  });
  if (!material) return fail("Ky material s'ekziston.");
  if (material.uploaderId === me.id) return fail("Materialin tënd s'mund ta vlerësosh vetë.");

  await db.materialRating.upsert({
    where: { materialId_userId: { materialId, userId: me.id } },
    create: { materialId, userId: me.id, value },
    update: { value },
  });

  const ratings = await db.materialRating.findMany({
    where: { materialId },
    select: { value: true },
  });
  const count = ratings.length;
  const average = ratings.reduce((sum, item) => sum + item.value, 0) / count;
  const positives = ratings.filter((item) => item.value >= 4).length;

  let status = material.verificationStatus;
  let hidden = false;

  if (positives >= VERIFICATION_THRESHOLD && status === "pending") {
    status = "verified";
  }
  if (count >= AUTO_HIDE_MIN_RATINGS && average < AUTO_HIDE_RATING) {
    status = "hidden";
    hidden = true;
  }

  await db.material.update({
    where: { id: materialId },
    data: {
      rating: Math.round(average * 10) / 10,
      ratingCount: count,
      verificationStatus: status,
      isHidden: hidden,
    },
  });

  revalidatePath(`/materialet/${materialId}`);
  return succeed(
    status === "verified" && material.verificationStatus === "pending"
      ? "Faleminderit. Ky material sapo kaloi kontrollin."
      : "E vlerësove.",
  );
}

export async function registerDownload(materialId: string): Promise<ActionState> {
  await requireUser();
  await db.material.update({
    where: { id: materialId },
    data: { downloads: { increment: 1 } },
  });
  return succeed();
}

// --- pyetje dhe përgjigje --------------------------------------------------

const questionSchema = z.object({
  courseId: z.string().min(1, "Zgjidh lëndën."),
  title: z.string().trim().min(10, "Shkruaj pyetjen e plotë.").max(160),
  text: z.string().trim().min(10, "Shpjego çfarë ke provuar.").max(4000),
});

export async function askQuestion(input: {
  courseId: string;
  title: string;
  text: string;
}): Promise<ActionState & { questionId?: string }> {
  const me = await requireUser();

  const limit = rateLimit("post", me.id);
  if (!limit.ok) return fail(rateLimitMessage(limit));

  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Pyetja s'është e plotë.");
  }

  const verdict = await screen(`${parsed.data.title} ${parsed.data.text}`);
  if (!verdict.allowed) return fail(verdict.message ?? "Ky tekst nuk kalon.");

  const question = await db.question.create({
    data: {
      authorId: me.id,
      courseId: parsed.data.courseId,
      title: parsed.data.title,
      text: parsed.data.text,
    },
  });

  await awardXp(me.id, "post");
  await touchStreak(me.id);

  revalidatePath("/pyetje");
  return { ...succeed("Pyetja u dërgua."), questionId: question.id };
}

export async function answerQuestion(
  questionId: string,
  text: string,
): Promise<ActionState> {
  const me = await requireUser();

  const trimmed = text.trim();
  if (trimmed.length < 10) return fail("Shkruaj një përgjigje që ndihmon vërtet.");
  if (trimmed.length > 4000) return fail("Përgjigjja është shumë e gjatë.");

  const verdict = await screen(trimmed);
  if (!verdict.allowed) return fail(verdict.message ?? "Ky tekst nuk kalon.");

  const question = await db.question.findUnique({
    where: { id: questionId },
    select: { authorId: true, title: true },
  });
  if (!question) return fail("Kjo pyetje s'ekziston.");

  await db.answer.create({ data: { questionId, authorId: me.id, text: trimmed } });

  if (question.authorId !== me.id) {
    await db.notification.create({
      data: {
        userId: question.authorId,
        type: "answer",
        actorId: me.id,
        targetId: questionId,
        text: "iu përgjigj pyetjes sate",
        context: `«${question.title.slice(0, 60)}»`,
      },
    });
  }

  await awardXp(me.id, "answer");
  await touchStreak(me.id);

  revalidatePath(`/pyetje/${questionId}`);
  return succeed("Përgjigja u dërgua. +15 XP");
}

export async function acceptAnswer(
  questionId: string,
  answerId: string,
): Promise<ActionState> {
  const me = await requireUser();

  const question = await db.question.findUnique({
    where: { id: questionId },
    select: { authorId: true },
  });
  if (!question) return fail("Kjo pyetje s'ekziston.");
  if (question.authorId !== me.id) return fail("Vetëm autori i pyetjes e pranon përgjigjen.");

  const answer = await db.answer.findUnique({
    where: { id: answerId },
    select: { authorId: true },
  });
  if (!answer) return fail("Kjo përgjigje s'ekziston.");

  await db.question.update({
    where: { id: questionId },
    data: { acceptedAnswerId: answerId },
  });

  if (answer.authorId !== me.id) {
    await awardXp(answer.authorId, "acceptedAnswer");
    await db.notification.create({
      data: {
        userId: answer.authorId,
        type: "accepted",
        actorId: me.id,
        targetId: questionId,
        text: "e pranoi përgjigjen tënde",
        context: "+40 XP",
      },
    });

    const accepted = await db.answer.count({
      where: { authorId: answer.authorId, question: { acceptedAnswerId: { not: null } } },
    });
    if (accepted >= 10) {
      const badge = await db.badge.findUnique({ where: { code: "savior" } });
      if (badge) {
        await db.userBadge
          .create({ data: { userId: answer.authorId, badgeId: badge.id } })
          .catch(() => undefined);
      }
    }
  }

  revalidatePath(`/pyetje/${questionId}`);
  return succeed("E pranove përgjigjen.");
}

export async function voteAnswer(answerId: string, value: 1 | -1): Promise<ActionState> {
  const me = await requireUser();

  const existing = await db.answerVote.findUnique({
    where: { answerId_userId: { answerId, userId: me.id } },
  });

  if (existing?.value === value) {
    await db.answerVote.delete({ where: { id: existing.id } });
  } else if (existing) {
    await db.answerVote.update({ where: { id: existing.id }, data: { value } });
  } else {
    await db.answerVote.create({ data: { answerId, userId: me.id, value } });
  }

  const votes = await db.answerVote.findMany({
    where: { answerId },
    select: { value: true },
  });
  await db.answer.update({
    where: { id: answerId },
    data: { votes: votes.reduce((sum, item) => sum + item.value, 0) },
  });

  return succeed();
}

// --- orari ------------------------------------------------------------------

export async function addExamDate(
  courseId: string,
  term: string,
  date: string,
): Promise<ActionState> {
  await requireUser();
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return fail("Data s'është e vlefshme.");

  await db.examDate.create({
    data: { courseId, term: term.trim() || "Afat provimi", date: parsedDate },
  });

  revalidatePath("/une");
  return succeed("Afati u shtua në orarin tënd.");
}
