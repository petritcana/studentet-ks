"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, requireParticipant } from "@/lib/session";
import { can } from "@/lib/permissions";
import { screen } from "@/lib/moderation";
import { awardActivityXp } from "@/lib/rewards";
import { fail, succeed, type ActionState } from "./types";

export async function createStudySession(input: {
  title: string;
  place: string;
  startsAt: string;
  courseId?: string;
  capacity?: number;
  note?: string;
}): Promise<ActionState & { id?: string }> {
  const me = await requireParticipant();

  if (!can(me.actor, "create_event").allowed) return fail("verify.lockedTitle");

  const title = input.title.trim();
  const place = input.place.trim();
  if (title.length < 3 || place.length < 2) return fail("errors.generic");

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) return fail("errors.generic");

  const verdict = await screen(`${title} ${input.note ?? ""}`);
  if (!verdict.allowed) return fail(`guard.${verdict.category}`);

  const session = await db.studyTogether.create({
    data: {
      authorId: me.id,
      title,
      place,
      startsAt,
      courseId: input.courseId || null,
      capacity: input.capacity ?? null,
      note: input.note?.trim() || null,
    },
  });

  // Autori shkon gjithmonë: një takim pa askënd duket i braktisur.
  await db.studyTogetherJoin.create({ data: { sessionId: session.id, userId: me.id } });
  await awardActivityXp(me.id, "post", session.id);

  revalidatePath("/komuniteti");
  return { ...succeed("study.created"), id: session.id };
}

/** Pjesëmarrja është ndërruese: i njëjti klikim e heq. */
export async function toggleStudyJoin(
  sessionId: string,
): Promise<ActionState & { joined?: boolean }> {
  const me = await requireParticipant();

  const existing = await db.studyTogetherJoin.findUnique({
    where: { sessionId_userId: { sessionId, userId: me.id } },
  });

  if (existing) {
    await db.studyTogetherJoin.delete({ where: { id: existing.id } });
    revalidatePath("/komuniteti");
    return { ...succeed(), joined: false };
  }

  const session = await db.studyTogether.findUnique({
    where: { id: sessionId },
    select: { capacity: true, _count: { select: { joiners: true } } },
  });
  if (!session) return fail("errors.notFoundContent");

  if (session.capacity && session._count.joiners >= session.capacity) {
    return fail("study.errorFull");
  }

  await db.studyTogetherJoin.create({ data: { sessionId, userId: me.id } });

  revalidatePath("/komuniteti");
  return { ...succeed("study.joined"), joined: true };
}

export async function deleteStudySession(sessionId: string): Promise<ActionState> {
  const me = await requireUser();

  const session = await db.studyTogether.findUnique({
    where: { id: sessionId },
    select: { authorId: true },
  });
  if (!session) return fail("errors.notFoundContent");
  if (session.authorId !== me.id && !can(me.actor, "moderate").allowed) {
    return fail("errors.forbidden");
  }

  await db.studyTogether.delete({ where: { id: sessionId } });
  revalidatePath("/komuniteti");
  return succeed();
}
