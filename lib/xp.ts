
export const CONTRIBUTION_XP = {
  materialApproved: 15,
  materialRatedHighly: 5,
  answerAccepted: 20,
  answerWellVoted: 8,
  materialMilestone: 10,
  eventContribution: 10,
  inviteRetained: 25,
  profileCompleted: 10,
  verified: 25,
} as const;

export const ACTIVITY_XP = {
  post: 3,
  comment: 2,
  dailyVisit: 1,
  reaction: 0.5,
} as const;

/** Ditët e Pro-s që jep secili kontribut. */
export const PRO_DAYS = {
  materialApproved: 7,
  answerAccepted: 1,
  /** Dhjetë materiale brenda një muaji japin tërë semestrin. */
  monthlyStreakOfTen: 150,
} as const;

export const XP_PENALTIES = {
  spam: -20,
  falseContent: -30,
  abuse: -50,
} as const;

/**
 * Kufijte ditore për burim, që asnje veprim te mos fermohet.
 *
 * Pa këto, njeqind komente ne një ore do te blinin një ditë Pro.
 */
export const DAILY_CAPS = {
  post: 5,
  comment: 20,
  dailyVisit: 1,
  reaction: 30,
} as const;

export type ContributionReason = keyof typeof CONTRIBUTION_XP;
export type ActivityReason = keyof typeof ACTIVITY_XP;

/** Sa vota pozitive e bëjnë një përgjigje të denjë për bonusin. */
export const WELL_VOTED_THRESHOLD = 5;
/** Sa shkarkime e aktivizojnë bonusin e materialit. */
export const MILESTONE_DOWNLOADS = 100;

// --- Këmbimi XP → Pro ------------------------------------------------------

export const EXCHANGE_RATES = [
  { days: 1, xp: 100 },
  { days: 30, xp: 2500 },
  { days: 150, xp: 10000 },
] as const;

/** Llogaritje me zbritje shkallëzore: paketat e mëdha janë më të lira për ditë. */
export function daysForXp(xp: number): number {
  if (xp < EXCHANGE_RATES[0].xp) return 0;

  let remaining = xp;
  let days = 0;

  for (const tier of [...EXCHANGE_RATES].reverse()) {
    const count = Math.floor(remaining / tier.xp);
    if (count > 0) {
      days += count * tier.days;
      remaining -= count * tier.xp;
    }
  }
  return days;
}

/** XP-ja minimale që duhet për një numër ditësh. E kundërta e `daysForXp`. */
export function xpForDays(days: number): number {
  if (days <= 0) return 0;

  let remaining = days;
  let xp = 0;

  for (const tier of [...EXCHANGE_RATES].reverse()) {
    const count = Math.floor(remaining / tier.days);
    if (count > 0) {
      xp += count * tier.xp;
      remaining -= count * tier.days;
    }
  }
  return xp + remaining * EXCHANGE_RATES[0].xp;
}

/** Sa ditë të plota mund të këmbejë tani, pa e kaluar bilancin. */
export function maxExchangeableDays(contributionXp: number) {
  return daysForXp(contributionXp);
}

/** Llogaritë nën shtatë ditë nuk këmbejnë, që fermat e llogarive të mos rrjedhin. */
export const MIN_ACCOUNT_AGE_DAYS = 7;

export function canExchange(user: { createdAt: Date; xpContribution: number }, now = new Date()) {
  const ageDays = (now.getTime() - user.createdAt.getTime()) / 86_400_000;
  if (ageDays < MIN_ACCOUNT_AGE_DAYS) return { ok: false as const, reason: "too-new" as const };
  if (daysForXp(user.xpContribution) < 1) return { ok: false as const, reason: "not-enough" as const };
  return { ok: true as const };
}

// --- Nivelet ---------------------------------------------------------------

/**
 * Nivelet ndjekin shumën e të dy llojeve të XP-së, sepse janë njohje, jo qasje.
 * Emrat janë studentorë, jo numra, dhe jetojnë te katalogu i përkthimeve.
 */
export const LEVELS = [
  { key: "newStudent", min: 0 },
  { key: "participant", min: 100 },
  { key: "contributor", min: 300 },
  { key: "helpful", min: 700 },
  { key: "activeContributor", min: 1500 },
  { key: "campusExpert", min: 3000 },
  { key: "knowledgeBuilder", min: 5500 },
  { key: "communityLeader", min: 9000 },
  { key: "academicContributor", min: 14000 },
  { key: "campusLegend", min: 20000 },
] as const;

export type LevelKey = (typeof LEVELS)[number]["key"];

export type LevelInfo = {
  key: LevelKey;
  index: number;
  current: number;
  floor: number;
  ceiling: number | null;
  next: LevelKey | null;
  toNext: number;
  percent: number;
};

export function levelFor(totalXp: number): LevelInfo {
  let index = 0;
  for (let position = 0; position < LEVELS.length; position += 1) {
    if (totalXp >= LEVELS[position].min) index = position;
  }

  const level = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const ceiling = next?.min ?? null;
  const percent = ceiling ? ((totalXp - level.min) / (ceiling - level.min)) * 100 : 100;

  return {
    key: level.key,
    index,
    current: totalXp,
    floor: level.min,
    ceiling,
    next: next?.key ?? null,
    toNext: ceiling ? Math.max(0, ceiling - totalXp) : 0,
    percent: Math.min(100, Math.max(0, percent)),
  };
}

/** Çelësi i katalogut për një nivel: `beginner` -> `levelBeginner`. */
export function levelLabelKey(key: LevelKey) {
  return `level${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

// --- Streak ----------------------------------------------------------------

export const FREE_FREEZES_PER_MONTH = 2;

export function nextStreak(
  user: { dailyStreak: number; lastStreakAt: Date | null; streakFreeze: number },
  now = new Date(),
) {
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  if (user.lastStreakAt && startOfDay(user.lastStreakAt) === startOfDay(now)) {
    return { streak: user.dailyStreak, freeze: user.streakFreeze, changed: false, usedFreeze: false };
  }

  const gap = user.lastStreakAt
    ? Math.round((startOfDay(now) - startOfDay(user.lastStreakAt)) / 86_400_000)
    : Infinity;

  if (gap === 1) {
    return { streak: user.dailyStreak + 1, freeze: user.streakFreeze, changed: true, usedFreeze: false };
  }

  // Një ditë e humbur mbulohet nga ngrirja, pa e parë askush tjetër.
  if (gap === 2 && user.streakFreeze > 0) {
    return {
      streak: user.dailyStreak + 1,
      freeze: user.streakFreeze - 1,
      changed: true,
      usedFreeze: true,
    };
  }

  return { streak: 1, freeze: user.streakFreeze, changed: true, usedFreeze: false };
}
