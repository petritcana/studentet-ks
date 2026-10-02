import "server-only";

import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { recordEvent } from "./feed";
import { earnedAchievements, STUDENT_ACHIEVEMENTS, type AchievementMetric } from "./rules";

/**
 * Arritjet e garës janë badge të zakonshëm (`Badge`, `UserBadge`), prandaj dalin
 * vetë te profili i studentit, bashkë me të tjerat. Secila lidhet me një numër të
 * vërtetë aktiviteti, jo me një klikim.
 */
const LABELS: Record<string, { name: string; nameEn: string; description: string; descriptionEn: string }> = {
  comp_first_win: {
    name: "Fitorja e parë",
    nameEn: "First victory",
    description: "Fitove betejën e parë të kuizit.",
    descriptionEn: "Won your first quiz battle.",
  },
  comp_quiz_master: {
    name: "Mjeshtër i kuizit",
    nameEn: "Quiz Master",
    description: "Fitove 25 beteja kuizi.",
    descriptionEn: "Won 25 quiz battles.",
  },
  comp_battle_veteran: {
    name: "Veteran i betejave",
    nameEn: "Battle Veteran",
    description: "Përfundove 100 beteja.",
    descriptionEn: "Completed 100 battles.",
  },
  comp_knowledge_contributor: {
    name: "Kontribues i dijes",
    nameEn: "Knowledge Contributor",
    description: "25 kontribute edukative të miratuara.",
    descriptionEn: "25 approved educational contributions.",
  },
  comp_university_champion: {
    name: "Kampion i universitetit",
    nameEn: "University Champion",
    description: "1.000 pikë gare për universitetin tënd.",
    descriptionEn: "1,000 competition points for your university.",
  },
  comp_seven_days: {
    name: "Shtatë ditë rresht",
    nameEn: "7-Day Challenger",
    description: "Garove shtatë ditë rresht.",
    descriptionEn: "Competed seven days in a row.",
  },
  comp_daily_regular: {
    name: "I rregullt në kuizin ditor",
    nameEn: "Daily Regular",
    description: "Përfundove 10 kuize ditore.",
    descriptionEn: "Completed 10 daily quizzes.",
  },
};

let badgesReady = false;

export async function ensureCompetitionBadges() {
  if (badgesReady) return;
  for (const achievement of STUDENT_ACHIEVEMENTS) {
    const label = LABELS[achievement.code];
    await db.badge.upsert({
      where: { code: achievement.code },
      create: { code: achievement.code, icon: achievement.icon, ...label },
      update: {},
    });
  }
  badgesReady = true;
}

/** Numrat që vendosin arritjet, të gjithë nga baza. */
export async function achievementMetrics(userId: string): Promise<Record<AchievementMetric, number>> {
  const [stats, contributions, points] = await Promise.all([
    db.competitorStats.findUnique({ where: { userId }, select: { wins: true, battles: true, streak: true, dailyDone: true } }),
    db.competitionPoint.count({
      where: { userId, revokedAt: null, source: { in: ["material_approved", "answer_accepted", "post_useful"] } },
    }),
    db.competitionPoint.aggregate({ where: { userId, revokedAt: null }, _sum: { points: true } }),
  ]);
  return {
    wins: stats?.wins ?? 0,
    battles: stats?.battles ?? 0,
    streak: stats?.streak ?? 0,
    daily: stats?.dailyDone ?? 0,
    contributions,
    points: points._sum.points ?? 0,
  };
}

/** Hap arritjet e reja dhe e njofton studentin. Arritja e fituar nuk hiqet. */
export async function checkAchievements(userId: string) {
  await ensureCompetitionBadges();
  const earned = earnedAchievements(await achievementMetrics(userId));
  if (earned.length === 0) return [];

  const owned = await db.userBadge.findMany({
    where: { userId, badge: { code: { in: earned } } },
    select: { badge: { select: { code: true } } },
  });
  const have = new Set(owned.map((row) => row.badge.code));
  const fresh = earned.filter((code) => !have.has(code));

  for (const code of fresh) {
    const badge = await db.badge.findUnique({ where: { code }, select: { id: true } });
    if (!badge) continue;
    await db.userBadge.create({ data: { userId, badgeId: badge.id, context: "competition" } });
    await notify({
      userId,
      category: "competition",
      type: "achievement_unlocked",
      targetType: "competition",
      targetId: code,
      payload: { code },
    });
    await recordEvent({ kind: "achievement", actorId: userId, payload: { code } });
  }
  return fresh;
}
