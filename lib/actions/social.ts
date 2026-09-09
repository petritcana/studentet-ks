"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAccount } from "@/lib/session";
import { getMutualContext } from "@/lib/suggestions";
import { rateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { awardXp } from "@/lib/xp";
import { fail, succeed, type ActionState } from "./types";

/**
 * Ndjekja është asimetrike si te Instagram-i. Kur të dyja drejtimet ekzistojnë,
 * lidhja bëhet shoqëri: hapet DM-ja pa kufizime dhe të dy marrin XP.
 */
export async function followUser(targetId: string): Promise<ActionState> {
  const me = await requireAccount();
  if (me.id === targetId) return fail("Veten s'mund ta ndjekësh.");

  const limit = rateLimit("follow", me.id);
  if (!limit.ok) return fail(rateLimitMessage(limit));

  const blocked = await db.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: targetId, blockedId: me.id },
        { blockerId: me.id, blockedId: targetId },
      ],
    },
  });
  if (blocked) return fail("Kjo lidhje nuk mund të krijohet.");

  const existing = await db.follow.findUnique({
    where: { followerId_followingId: { followerId: me.id, followingId: targetId } },
  });
  if (existing) return succeed();

  const reverse = await db.follow.findUnique({
    where: { followerId_followingId: { followerId: targetId, followingId: me.id } },
  });
  const becomesMutual = Boolean(reverse);

  await db.follow.create({
    data: { followerId: me.id, followingId: targetId, isMutual: becomesMutual },
  });

  if (becomesMutual) {
    await db.follow.update({
      where: { followerId_followingId: { followerId: targetId, followingId: me.id } },
      data: { isMutual: true },
    });

    // Reciprociteti shpërblehet, kurrë nuk detyrohet.
    await awardXp(me.id, "mutualFollow");
    await awardXp(targetId, "mutualFollow");

    const existingConversation = await db.conversation.findFirst({
      where: {
        type: "direct",
        AND: [
          { members: { some: { userId: me.id } } },
          { members: { some: { userId: targetId } } },
        ],
      },
      select: { id: true },
    });
    if (!existingConversation) {
      const conversation = await db.conversation.create({ data: { type: "direct" } });
      await db.conversationMember.createMany({
        data: [
          { conversationId: conversation.id, userId: me.id },
          { conversationId: conversation.id, userId: targetId },
        ],
      });
    }

    await db.notification.create({
      data: {
        userId: targetId,
        type: "mutual",
        actorId: me.id,
        text: "u bë shoku yt",
        context: "Tani mund t'i shkruani lirshëm.",
      },
    });
  } else {
    const context = await getMutualContext(targetId, me.id);
    await db.notification.create({
      data: {
        userId: targetId,
        type: "follow",
        actorId: me.id,
        targetId: me.id,
        text: "po të ndjek",
        context: context.slice(0, 2).join(" · ") || null,
      },
    });
  }

  revalidatePath("/kampusi");
  return succeed(becomesMutual ? "U bëtë shokë." : "E ndoqe.");
}

export async function unfollowUser(targetId: string): Promise<ActionState> {
  const me = await requireAccount();

  await db.follow.deleteMany({ where: { followerId: me.id, followingId: targetId } });
  await db.follow.updateMany({
    where: { followerId: targetId, followingId: me.id },
    data: { isMutual: false },
  });

  revalidatePath("/kampusi");
  return succeed();
}

/** Rrethet e shpejta: ndiq një grup të tërë me një klikim. */
export async function followMany(targetIds: string[]): Promise<ActionState> {
  const me = await requireAccount();
  const unique = [...new Set(targetIds)].filter((id) => id !== me.id).slice(0, 60);

  for (const id of unique) {
    await followUser(id);
  }
  return succeed(`I ndoqe ${unique.length} veta.`);
}

export type QuickCircle = "generation" | "course" | "highSchool" | "city";

export async function followCircle(
  circle: QuickCircle,
  courseId?: string,
): Promise<ActionState> {
  const me = await requireAccount();

  const following = await db.follow.findMany({
    where: { followerId: me.id },
    select: { followingId: true },
  });
  const excluded = [me.id, ...following.map((item) => item.followingId)];

  const where =
    circle === "generation"
      ? { facultyId: me.facultyId ?? undefined, year: me.year ?? undefined }
      : circle === "course"
        ? { enrollments: { some: { courseId: courseId ?? "" } } }
        : circle === "highSchool"
          ? { highSchool: me.highSchool ?? "___" }
          : { city: me.city ?? "___" };

  const targets = await db.user.findMany({
    where: { ...where, id: { notIn: excluded }, onboardedAt: { not: null } },
    select: { id: true },
    take: 40,
  });

  if (targets.length === 0) {
    return fail("S'ka njeri të ri për të ndjekur në këtë rreth.");
  }

  return followMany(targets.map((target) => target.id));
}

export async function blockUser(targetId: string, kind: "block" | "mute" = "block") {
  const me = await requireAccount();
  if (me.id === targetId) return fail("Veten s'mund ta bllokosh.");

  await db.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId: me.id, blockedId: targetId } },
    create: { blockerId: me.id, blockedId: targetId, kind },
    update: { kind },
  });

  if (kind === "block") {
    await db.follow.deleteMany({
      where: {
        OR: [
          { followerId: me.id, followingId: targetId },
          { followerId: targetId, followingId: me.id },
        ],
      },
    });
  }

  revalidatePath("/cilesimet");
  return succeed(kind === "block" ? "E bllokove." : "E heshte.");
}

export async function unblockUser(targetId: string) {
  const me = await requireAccount();
  await db.userBlock.deleteMany({ where: { blockerId: me.id, blockedId: targetId } });
  revalidatePath("/cilesimet");
  return succeed();
}
