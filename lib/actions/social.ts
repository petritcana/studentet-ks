"use server";

import { revalidatePath } from "next/cache";
import { audienceSelect, canFollow } from "@/lib/audience";
import { db } from "@/lib/db";
import { requireAccount, requireParticipantAccount } from "@/lib/session";
import { getMutualContext } from "@/lib/suggestions";
import { rateLimit } from "@/lib/rate-limit";
import { ACTIVITY_XP } from "@/lib/xp";
import { acceptedFollow, FOLLOW_DECLINED, FOLLOW_PENDING } from "@/lib/follow";
import { fail, succeed, type ActionState } from "./types";

/**
 * Ndjekja është asimetrike. Kur të dyja drejtimet ekzistojnë, lidhja bëhet
 * shoqëri: hapet DM-ja pa kufizime dhe të dy marrin XP aktiviteti.
 *
 * Reciprociteti shpërblehet, kurrë nuk detyrohet. Raporti ndjek/ndjekës nuk
 * shfaqet askund dhe nuk ekziston asnjë «follow-back checker».
 */
export async function followUser(targetId: string): Promise<ActionState> {
  const me = await requireParticipantAccount();
  if (me.id === targetId) return fail("social.errorSelf");

  const limit = rateLimit("follow", me.id);
  if (!limit.ok) return fail("errors.rateLimited");

  const blocked = await db.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: targetId, blockedId: me.id },
        { blockerId: me.id, blockedId: targetId },
      ],
    },
  });
  if (blocked) return fail("social.errorBlocked");

  const existing = await db.follow.findUnique({
    where: { followerId_followingId: { followerId: me.id, followingId: targetId } },
    select: { status: true },
  });
  // Një kërkesë në pritje ose një ndjekje e pranuar nuk përsëritet.
  if (existing && existing.status !== "declined") return succeed();

  /*
    Ndjekja nis si kërkesë.

    Platforma mbahet mbi identitete të vërteta studentësh, prandaj kush bëhet
    ndjekësi yt e vendos ti. Ndjekja e drejtpërdrejtë ndodh vetëm kur pronari e
    ka ndezur vetë pranimin automatik.
  */
  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { autoAcceptFollows: true, ...audienceSelect() },
  });
  if (!target) return fail("errors.notFoundContent");

  // Cilësimi i pronarit vendos para çdo gjëje tjetër.
  const allowed = await canFollow(
    { id: me.id, verification: me.verification, universityId: me.universityId },
    target,
  );
  if (!allowed) return fail("social.errorFollowClosed");

  if (!target.autoAcceptFollows) {
    await db.follow.upsert({
      where: { followerId_followingId: { followerId: me.id, followingId: targetId } },
      create: { followerId: me.id, followingId: targetId, isMutual: false, status: FOLLOW_PENDING },
      update: { status: FOLLOW_PENDING, respondedAt: null },
    });

    await db.notification.deleteMany({
      where: { userId: targetId, type: "follow_request", actorId: me.id },
    });
    await db.notification.create({
      data: {
        userId: targetId,
        category: "social",
        type: "follow_request",
        actorId: me.id,
        targetId: me.id,
        payload: JSON.stringify({}),
      },
    });

    revalidatePath("/njoftimet");
    return succeed("social.requested");
  }

  const reverse = await db.follow.findUnique({
    where: { followerId_followingId: { followerId: targetId, followingId: me.id } },
    select: { status: true },
  });
  const becomesMutual = reverse?.status === "accepted";

  await db.follow.upsert({
    where: { followerId_followingId: { followerId: me.id, followingId: targetId } },
    create: {
      followerId: me.id,
      followingId: targetId,
      isMutual: becomesMutual,
      status: "accepted",
      respondedAt: new Date(),
    },
    update: { status: "accepted", isMutual: becomesMutual, respondedAt: new Date() },
  });

  if (becomesMutual) {
    await db.follow.update({
      where: { followerId_followingId: { followerId: targetId, followingId: me.id } },
      data: { isMutual: true },
    });

    for (const userId of [me.id, targetId]) {
      await db.user.update({
        where: { id: userId },
        data: { xpActivity: { increment: ACTIVITY_XP.post } },
      });
      await db.xpTransaction.create({
        data: { userId, kind: "activity", amount: ACTIVITY_XP.post, reason: "mutual_follow" },
      });
    }

    const existingConversation = await db.conversation.findFirst({
      where: {
        type: "direct",
        AND: [{ members: { some: { userId: me.id } } }, { members: { some: { userId: targetId } } }],
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
        category: "social",
        type: "mutual",
        actorId: me.id,
        payload: JSON.stringify({}),
      },
    });
  } else {
    // Njoftimi vjen me kontekst dhe me veprim, jo si "X po të ndjek" i thatë.
    const context = await getMutualContext(targetId, me.id);
    const shared = context.find((reason) => reason.key.startsWith("sharedCourse"));

    await db.notification.create({
      data: {
        userId: targetId,
        category: "social",
        type: "follow",
        actorId: me.id,
        targetId: me.id,
        payload: JSON.stringify({ shared: shared?.values?.count ?? 0 }),
      },
    });
  }

  revalidatePath("/kampusi");
  return succeed(becomesMutual ? "social.nowFriends" : "social.followed");
}

/**
 * Çndjekja, dhe tërheqja e një kërkese.
 *
 * I njëjti veprim i mbulon të dyja: një kërkesë në pritje është po ashtu një
 * rresht ndjekjeje, dhe studenti e mendon si «e ndal». Njoftimi i kërkesës
 * hiqet bashkë me të, që pronari të mos vendosë për diçka që u tërhoq.
 */
export async function unfollowUser(targetId: string): Promise<ActionState> {
  const me = await requireAccount();

  await db.$transaction([
    db.follow.deleteMany({ where: { followerId: me.id, followingId: targetId } }),
    db.follow.updateMany({
      where: { followerId: targetId, followingId: me.id },
      data: { isMutual: false },
    }),
    db.notification.deleteMany({
      where: { userId: targetId, type: "follow_request", actorId: me.id },
    }),
  ]);

  revalidatePath("/feed");
  revalidatePath("/komuniteti");
  revalidatePath("/njoftimet");
  return succeed();
}

export async function followMany(targetIds: string[]): Promise<ActionState> {
  const me = await requireParticipantAccount();
  const unique = [...new Set(targetIds)].filter((id) => id !== me.id).slice(0, 60);
  for (const id of unique) await followUser(id);
  return succeed("social.followedMany", { count: unique.length });
}

export type QuickCircle = "generation" | "faculty" | "highSchool" | "city";

/** Rrethet e shpejta: lidhu me një grup të tërë me një klikim. */
export async function followCircle(circle: QuickCircle): Promise<ActionState> {
  const me = await requireParticipantAccount();

  const following = await db.follow.findMany({
    where: { followerId: me.id, ...acceptedFollow },
    select: { followingId: true },
  });
  const excluded = [me.id, ...following.map((item) => item.followingId)];

  const where =
    circle === "generation"
      ? { facultyId: me.facultyId ?? undefined, year: me.year ?? undefined }
      : circle === "faculty"
        ? { facultyId: me.facultyId ?? undefined }
        : circle === "highSchool"
          ? { highSchool: me.highSchool ?? "___" }
          : { city: me.city ?? "___" };

  const targets = await db.user.findMany({
    where: { ...where, id: { notIn: excluded }, onboardedAt: { not: null }, role: "student" },
    select: { id: true },
    take: 40,
  });

  if (targets.length === 0) return fail("social.circleEmpty");
  return followMany(targets.map((target) => target.id));
}

export async function blockUser(targetId: string, kind: "block" | "mute" = "block") {
  const me = await requireAccount();
  if (me.id === targetId) return fail("social.errorSelf");

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
  return succeed(kind === "block" ? "social.blocked" : "social.muted");
}

export async function unblockUser(targetId: string) {
  const me = await requireAccount();
  await db.userBlock.deleteMany({ where: { blockerId: me.id, blockedId: targetId } });
  revalidatePath("/cilesimet");
  return succeed();
}

/**
 * Pranimi i kërkesës për ndjekje.
 *
 * Vetëm pronari i profilit vendos. Pranimi e kthen lidhjen në ndjekje të
 * zakonshme, dhe nëse edhe ai e ndjek kërkuesin, të dy bëhen shokë.
 */
export async function acceptFollowRequest(requesterId: string): Promise<ActionState> {
  const me = await requireAccount();

  const request = await db.follow.findUnique({
    where: { followerId_followingId: { followerId: requesterId, followingId: me.id } },
    select: { status: true },
  });
  if (!request || request.status !== FOLLOW_PENDING) return fail("errors.notFoundContent");

  const reverse = await db.follow.findUnique({
    where: { followerId_followingId: { followerId: me.id, followingId: requesterId } },
    select: { status: true },
  });
  const becomesMutual = reverse?.status === "accepted";

  await db.follow.update({
    where: { followerId_followingId: { followerId: requesterId, followingId: me.id } },
    data: { status: "accepted", isMutual: becomesMutual, respondedAt: new Date() },
  });
  if (becomesMutual) {
    await db.follow.update({
      where: { followerId_followingId: { followerId: me.id, followingId: requesterId } },
      data: { isMutual: true },
    });
  }

  await db.notification.deleteMany({
    where: { userId: me.id, type: "follow_request", actorId: requesterId },
  });
  await db.notification.create({
    data: {
      userId: requesterId,
      category: "social",
      type: becomesMutual ? "mutual" : "follow_accepted",
      actorId: me.id,
      targetId: me.id,
      payload: JSON.stringify({}),
    },
  });

  revalidatePath("/njoftimet");
  return succeed("social.requestAccepted");
}

/** Refuzimi e fshin kërkesën pa i thënë asgjë kërkuesit. */
export async function declineFollowRequest(requesterId: string): Promise<ActionState> {
  const me = await requireAccount();

  await db.follow.updateMany({
    where: { followerId: requesterId, followingId: me.id, status: FOLLOW_PENDING },
    data: { status: FOLLOW_DECLINED, respondedAt: new Date() },
  });
  await db.notification.deleteMany({
    where: { userId: me.id, type: "follow_request", actorId: requesterId },
  });

  revalidatePath("/njoftimet");
  return succeed();
}

/** Sa kërkesa ndjekjeje presin vendimin tim. */
export async function countFollowRequests(userId: string) {
  return db.follow.count({ where: { followingId: userId, status: FOLLOW_PENDING } });
}
