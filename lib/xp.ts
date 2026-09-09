import { db } from "@/lib/db";

/**
 * XP-ja shpërblen ndihmën, jo praninë. Prandaj ngarkimi i një materiali vlen sa
 * pesë postime, dhe një përgjigje e pranuar sa katër.
 */
export const XP_VALUES = {
  materialUpload: 50,
  acceptedAnswer: 40,
  answer: 15,
  post: 10,
  comment: 5,
  dailyVisit: 5,
  successfulInvite: 100,
  mutualFollow: 10,
} as const;

export type XpReason = keyof typeof XP_VALUES;

export const XP_REASON_LABELS: Record<XpReason, string> = {
  materialUpload: "Ngarkove material",
  acceptedAnswer: "Përgjigjja jote u pranua",
  answer: "Përgjigje",
  post: "Postim",
  comment: "Koment",
  dailyVisit: "Hyrje ditore",
  successfulInvite: "Ftesë e suksesshme",
  mutualFollow: "U bëtë shokë",
};

/** Nivelet kanë emra studentorë, jo numra. */
export const LEVELS = [
  { min: 0, name: "Fillestar", description: "Sapo ke ardhur. Gjithçka është përpara." },
  { min: 250, name: "Kolegi", description: "Ke nisur të ndihmosh, dhe kjo shihet." },
  { min: 1000, name: "Bartës shënimesh", description: "Shënimet e tua i shpëtojnë të tjerët." },
  { min: 2500, name: "Shpëtimtar provimesh", description: "Gjenerata jote e di emrin tënd." },
  { min: 6000, name: "Legjendë e fakultetit", description: "Materialet e tua do t'i lexojnë edhe pas teje." },
] as const;

export type LevelInfo = {
  name: string;
  description: string;
  index: number;
  current: number;
  floor: number;
  ceiling: number | null;
  next: string | null;
  toNext: number;
  percent: number;
};

export function levelFor(xp: number): LevelInfo {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (xp >= LEVELS[i].min) index = i;
  }
  const level = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const floor = level.min;
  const ceiling = next?.min ?? null;
  const percent = ceiling ? ((xp - floor) / (ceiling - floor)) * 100 : 100;

  return {
    name: level.name,
    description: level.description,
    index,
    current: xp,
    floor,
    ceiling,
    next: next?.name ?? null,
    toNext: ceiling ? Math.max(0, ceiling - xp) : 0,
    percent: Math.min(100, Math.max(0, percent)),
  };
}

export async function awardXp(userId: string, reason: XpReason) {
  const amount = XP_VALUES[reason];
  const updated = await db.user.update({
    where: { id: userId },
    data: { xp: { increment: amount } },
    select: { xp: true },
  });

  const before = levelFor(updated.xp - amount);
  const after = levelFor(updated.xp);
  if (after.index > before.index) {
    await db.notification.create({
      data: {
        userId,
        type: "badge",
        text: `U ngrite në nivelin ${after.name}`,
        context: after.description,
      },
    });
  }
  return { xp: updated.xp, leveledUp: after.index > before.index, level: after };
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

  const now = new Date();
  const last = user.lastStreakAt;
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  if (last && startOfDay(last) === startOfDay(now)) {
    return { streak: user.dailyStreak, changed: false, usedFreeze: false };
  }

  const dayGap = last ? Math.round((startOfDay(now) - startOfDay(last)) / 86400000) : Infinity;

  let streak = user.dailyStreak;
  let freeze = user.streakFreeze;
  let usedFreeze = false;

  if (dayGap === 1) {
    streak += 1;
  } else if (dayGap === 2 && freeze > 0) {
    // Një ditë e humbur mbulohet nga ngrirja, pa e njoftuar askënd tjetër.
    streak += 1;
    freeze -= 1;
    usedFreeze = true;
  } else {
    streak = 1;
  }

  await db.user.update({
    where: { id: userId },
    data: { dailyStreak: streak, lastStreakAt: now, streakFreeze: freeze },
  });
  await awardXp(userId, "dailyVisit");

  return { streak, changed: true, usedFreeze };
}
