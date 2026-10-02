import { db } from "@/lib/db";
import {
  ACTIVITY_XP,
  DAILY_CAPS,
  XP_PENALTIES,
  CONTRIBUTION_XP,
  PRO_DAYS,
  nextStreak,
  type ActivityReason,
  type ContributionReason,
} from "@/lib/xp";

export { PRO_DAYS };

export const MONTHLY_MATERIAL_TARGET = 10;

/** Shton ditë Pro duke zgjatur `proEarnedUntil`, kurrë duke e mbishkruar. */
export async function grantProDays(userId: string, days: number) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { proEarnedUntil: true, proDaysEarned: true },
  });
  if (!user) return null;

  const now = new Date();
  const base = user.proEarnedUntil && user.proEarnedUntil > now ? user.proEarnedUntil : now;
  const until = new Date(base.getTime() + days * 86_400_000);

  await db.user.update({
    where: { id: userId },
    data: { proEarnedUntil: until, proDaysEarned: user.proDaysEarned + days },
  });

  await db.subscription.upsert({
    where: { id: `contribution-${userId}` },
    create: {
      id: `contribution-${userId}`,
      userId,
      status: "active",
      source: "contribution",
      expiresAt: until,
    },
    update: { status: "active", expiresAt: until },
  });

  return until;
}

/** Heq ditë Pro kur një kontribut anulohet ose fshihet. */
export async function revokeProDays(userId: string, days: number) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { proEarnedUntil: true, proDaysEarned: true },
  });
  if (!user?.proEarnedUntil) return;

  const until = new Date(user.proEarnedUntil.getTime() - days * 86_400_000);
  await db.user.update({
    where: { id: userId },
    data: {
      proEarnedUntil: until,
      proDaysEarned: Math.max(0, user.proDaysEarned - days),
    },
  });
  await db.subscription.updateMany({
    where: { id: `contribution-${userId}` },
    data: { expiresAt: until, status: until > new Date() ? "active" : "expired" },
  });
}

export async function awardContributionXp(
  userId: string,
  reason: ContributionReason,
  targetId?: string,
) {
  const amount = CONTRIBUTION_XP[reason];
  await db.user.update({
    where: { id: userId },
    data: { xpContribution: { increment: amount } },
  });
  await db.xpTransaction.create({
    data: { userId, kind: "contribution", amount, reason: snake(reason), targetId },
  });
  return amount;
}

export async function awardActivityXp(userId: string, reason: ActivityReason, targetId?: string) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const usedToday = await db.xpTransaction.count({
    where: { userId, kind: "activity", reason: snake(reason), createdAt: { gte: since } },
  });

  if (usedToday >= DAILY_CAPS[reason]) return 0;

  const amount = ACTIVITY_XP[reason];
  await db.user.update({ where: { id: userId }, data: { xpActivity: { increment: amount } } });
  await db.xpTransaction.create({
    data: { userId, kind: "activity", amount, reason: snake(reason), targetId },
  });
  return amount;
}

export async function penaliseXp(
  userId: string,
  kind: "spam" | "falseContent" | "abuse",
  targetId?: string,
) {
  const amount = XP_PENALTIES[kind];
  await db.user.update({
    where: { id: userId },
    data: { xpActivity: { increment: amount } },
  });
  await db.xpTransaction.create({
    data: { userId, kind: "activity", amount, reason: snake(kind), targetId },
  });
  return amount;
}

function snake(value: string) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Miratimi i një materiali. Jep 50 XP kontributi dhe 7 ditë Pro, një herë të
 * vetme, dhe kontrollon nëse studenti e ka arritur pragun mujor prej dhjetë.
 */
export async function rewardMaterialApproved(materialId: string) {
  const material = await db.material.findUnique({
    where: { id: materialId },
    select: { id: true, uploaderId: true, rewardedAt: true, title: true },
  });
  if (!material || material.rewardedAt) return null;

  await db.material.update({ where: { id: materialId }, data: { rewardedAt: new Date() } });

  const xp = await awardContributionXp(material.uploaderId, "materialApproved", materialId);
  await grantProDays(material.uploaderId, PRO_DAYS.materialApproved);

  await db.notification.create({
    data: {
      userId: material.uploaderId,
      category: "academic",
      type: "material_approved",
      targetId: materialId,
      targetType: "material",
      payload: JSON.stringify({ xp, days: PRO_DAYS.materialApproved }),
    },
  });

  // Dhjetë materiale të miratuara brenda një muaji japin tërë semestrin.
  const monthAgo = new Date(Date.now() - 30 * 86_400_000);
  const monthly = await db.material.count({
    where: {
      uploaderId: material.uploaderId,
      rewardedAt: { gte: monthAgo },
      verificationStatus: "verified",
    },
  });

  if (monthly === MONTHLY_MATERIAL_TARGET) {
    await grantProDays(material.uploaderId, PRO_DAYS.monthlyStreakOfTen);
    await db.notification.create({
      data: {
        userId: material.uploaderId,
        category: "progress",
        type: "pro_earned",
        payload: JSON.stringify({ days: PRO_DAYS.monthlyStreakOfTen }),
      },
    });
  }

  await checkArchivistBadges(material.uploaderId);
  return xp;
}

/** Materiali që kalon 100 shkarkime jep një bonus, një herë të vetme. */
export async function rewardMaterialMilestone(materialId: string) {
  const material = await db.material.findUnique({
    where: { id: materialId },
    select: { uploaderId: true, downloads: true, milestoneAt: true, verificationStatus: true },
  });
  if (!material || material.milestoneAt) return;
  if (material.verificationStatus !== "verified" || material.downloads < 100) return;

  await db.material.update({ where: { id: materialId }, data: { milestoneAt: new Date() } });
  const xp = await awardContributionXp(material.uploaderId, "materialMilestone", materialId);

  await db.notification.create({
    data: {
      userId: material.uploaderId,
      category: "academic",
      type: "material_milestone",
      targetId: materialId,
      targetType: "material",
      payload: JSON.stringify({ downloads: 100, xp }),
    },
  });
}

/** Përgjigja e pranuar jep 40 XP kontributi dhe një ditë Pro. */
export async function rewardAnswerAccepted(answerId: string) {
  const answer = await db.answer.findUnique({
    where: { id: answerId },
    select: { id: true, authorId: true, rewardedAt: true, questionId: true },
  });
  if (!answer || answer.rewardedAt) return null;

  await db.answer.update({ where: { id: answerId }, data: { rewardedAt: new Date() } });

  const xp = await awardContributionXp(answer.authorId, "answerAccepted", answerId);
  await grantProDays(answer.authorId, PRO_DAYS.answerAccepted);

  await db.notification.create({
    data: {
      userId: answer.authorId,
      category: "academic",
      type: "answer_accepted",
      targetId: answer.questionId,
      targetType: "question",
      payload: JSON.stringify({ xp, days: PRO_DAYS.answerAccepted }),
    },
  });

  const accepted = await db.answer.count({
    where: { authorId: answer.authorId, rewardedAt: { not: null } },
  });
  if (accepted === 10) await grantBadge(answer.authorId, "savior");
  if (accepted === 50) await grantBadge(answer.authorId, "helper");

  return xp;
}

export async function grantBadge(userId: string, code: string, context?: string, expiresAt?: Date) {
  const badge = await db.badge.findUnique({ where: { code } });
  if (!badge) return;

  await db.userBadge
    .create({ data: { userId, badgeId: badge.id, context: context ?? null, expiresAt } })
    .catch(() => undefined);

  await db.notification.create({
    data: {
      userId,
      category: "progress",
      type: "badge_new",
      payload: JSON.stringify({ badge: code }),
    },
  });
}

async function checkArchivistBadges(userId: string) {
  const approved = await db.material.count({
    where: { uploaderId: userId, verificationStatus: "verified" },
  });
  if (approved === 25) await grantBadge(userId, "archivist");
  if (approved === 50) await grantBadge(userId, "golden_contributor");
}

/**
 * Streak-u kërkon një veprim kuptimplotë, jo kohë të kaluar në ekran. Humbja
 * kurrë nuk shfaqet publikisht dhe ngrirjet janë të dukshme para se të duhen.
 */
export async function touchStreak(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { dailyStreak: true, lastStreakAt: true, streakFreeze: true },
  });
  if (!user) return null;

  const result = nextStreak(user);
  if (!result.changed) return result;

  await db.user.update({
    where: { id: userId },
    data: { dailyStreak: result.streak, streakFreeze: result.freeze, lastStreakAt: new Date() },
  });
  await awardActivityXp(userId, "dailyVisit");

  if (result.streak === 30) await grantBadge(userId, "streak_30");

  return result;
}

/**
 * Ftesa shpërblehet vetëm pasi i ftuari mbetet aktiv shtatë ditë. Kjo e mbyll
 * rrugën më të lehtë të abuzimit: llogari të reja që krijohen dhe braktisen.
 */
export async function settleMaturedInvites() {
  const cutoff = new Date(Date.now() - 7 * 86_400_000);

  const invites = await db.invite.findMany({
    where: { usedAt: { lte: cutoff }, rewardedAt: null, invitedUserId: { not: null } },
    select: { id: true, inviterId: true, invitedUserId: true },
    take: 100,
  });

  let settled = 0;

  for (const invite of invites) {
    const invited = await db.user.findUnique({
      where: { id: invite.invitedUserId! },
      select: { lastSeenAt: true, createdAt: true },
    });
    if (!invited) continue;

    const activeAfterWeek =
      invited.lastSeenAt.getTime() - invited.createdAt.getTime() >= 7 * 86_400_000;
    if (!activeAfterWeek) continue;

    await db.invite.update({ where: { id: invite.id }, data: { rewardedAt: new Date() } });
    await awardContributionXp(invite.inviterId, "inviteRetained", invite.id);
    settled += 1;

    const total = await db.invite.count({
      where: { inviterId: invite.inviterId, rewardedAt: { not: null } },
    });
    if (total === 10) await grantBadge(invite.inviterId, "ambassador");
  }

  return settled;
}

export async function revokeMaterialReward(materialId: string, uploaderId: string) {
  const transactions = await db.xpTransaction.findMany({
    where: { targetId: materialId, kind: "contribution", revokedAt: null },
    select: { id: true, amount: true },
  });
  if (transactions.length === 0) return 0;

  const total = transactions.reduce((sum, item) => sum + item.amount, 0);

  await db.user.update({
    where: { id: uploaderId },
    data: { xpContribution: { decrement: total } },
  });

  await db.xpTransaction.updateMany({
    where: { id: { in: transactions.map((item) => item.id) } },
    data: { revokedAt: new Date(), revokedReason: "material_removed" },
  });

  await revokeProDays(uploaderId, 7);
  await db.material.update({ where: { id: materialId }, data: { rewardedAt: null } });

  return total;
}
