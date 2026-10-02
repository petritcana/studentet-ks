/**
 * Rregullat e garës, pa bazë dhe pa sesion, që të provohen më vete dhe të
 * shfaqen njësoj te faqja «Si fitohen pikët».
 *
 * Pikët shpërblejnë pjesëmarrjen me kuptim, jo sasinë: çdo burim ka kufi ditor,
 * dhe i gjithë aktiviteti i një studenti ka një tavan ditor, që askush të mos e
 * fryjë vetëm universitetin e vet.
 */

import { kosovoParts } from "@/lib/format";

export const QUESTIONS_PER_BATTLE = 5;
export const SECONDS_PER_QUESTION = 20;
/** Kohë shtesë për vonesën e rrjetit para se përgjigjja të quhet e vonuar. */
export const GRACE_SECONDS = 4;
export const DAILY_QUESTIONS = 5;
export const DAILY_SECONDS = 120;
/** Sa kohë pret një sfidë ose një betejë e rastit para se të skadojë. */
export const PENDING_HOURS = 24;

export type PointSource =
  | "battle_complete"
  | "battle_win"
  | "daily_quiz"
  | "event_quiz"
  | "material_approved"
  | "answer_accepted"
  | "post_useful";

/** Sa pikë jep çdo veprim. Kuizet japin për çdo përgjigje të saktë. */
export const POINTS: Record<PointSource, number> = {
  battle_complete: 5,
  battle_win: 10,
  daily_quiz: 2,
  event_quiz: 3,
  material_approved: 20,
  answer_accepted: 15,
  post_useful: 5,
};

/** Sa herë në ditë numërohet çdo burim për një student. */
export const DAILY_CAPS: Record<PointSource, number> = {
  battle_complete: 10,
  battle_win: 5,
  daily_quiz: 1,
  event_quiz: 5,
  material_approved: 5,
  answer_accepted: 5,
  post_useful: 5,
};

/** Sa ruajtje nga të tjerët e bëjnë një postim «të dobishëm» për garën. */
export const USEFUL_POST_SAVES = 5;

/** Tavani ditor i të gjitha pikëve të një studenti. */
export const DAILY_POINT_CAP = 150;

/** Fitoret kundër të njëjtit kundërshtar që numërohen në ditë. */
export const SAME_OPPONENT_WINS_PER_DAY = 2;

/** Sa pikë lejohen për këtë veprim, pasi të llogariten kufijtë e ditës. */
export function allowedPoints(input: {
  source: PointSource;
  points: number;
  countedToday: number;
  pointsToday: number;
}) {
  if (input.countedToday >= DAILY_CAPS[input.source]) return 0;
  return Math.max(0, Math.min(input.points, DAILY_POINT_CAP - input.pointsToday));
}

export type EntryResult = { userId: string; correct: number; timeMs: number; finished: boolean };

/**
 * Fituesi: më shumë përgjigje të sakta, pastaj më pak kohë. Barazim i plotë nuk
 * ka fitues. Lojtari që nuk e mbaroi humb ndaj atij që e mbaroi.
 */
export function battleWinner(entries: EntryResult[]): string | null {
  if (entries.length < 2) return null;
  const [a, b] = entries;
  if (a.finished !== b.finished) return a.finished ? a.userId : b.userId;
  if (a.correct !== b.correct) return a.correct > b.correct ? a.userId : b.userId;
  if (a.correct === 0) return null;
  if (a.timeMs !== b.timeMs) return a.timeMs < b.timeMs ? a.userId : b.userId;
  return null;
}

/** Elo i thjeshtë, K = 24. Kthen vlerësimet e reja. */
export function eloUpdate(ratingA: number, ratingB: number, scoreA: 0 | 0.5 | 1) {
  const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
  const change = Math.round(24 * (scoreA - expectedA));
  return { a: ratingA + change, b: ratingB - change };
}

/** Dita e Kosovës si «2026-09-23». */
export function dayKey(date: Date = new Date()) {
  const { year, month, day } = kosovoParts(date);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Java ISO e Kosovës si «2026-W39», me fillimin (e hënë) dhe fundin (e hëna tjetër). */
export function weekOf(date: Date = new Date()) {
  const { year, month, day } = kosovoParts(date);
  const local = new Date(Date.UTC(year, month, day));
  const weekday = local.getUTCDay() || 7;
  const monday = new Date(local);
  monday.setUTCDate(local.getUTCDate() - (weekday - 1));

  // Java ISO: e enjtja e javës vendos vitin.
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const firstMonday = new Date(firstThursday);
  firstMonday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() || 7) - 1));
  const week = 1 + Math.round((monday.getTime() - firstMonday.getTime()) / (7 * 86_400_000));

  // Mesnata e Kosovës: UTC+1 në dimër, UTC+2 në verë. Ora e saktë merret nga dita.
  const offsetOf = (utcMidnight: Date) => {
    const probe = new Date(utcMidnight.getTime() + 12 * 3_600_000);
    const hour = Number(kosovoParts(probe).hour);
    return (hour - 12) * 3_600_000;
  };
  const starts = new Date(monday.getTime() - offsetOf(monday));
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(monday.getUTCDate() + 7);
  const ends = new Date(nextMonday.getTime() - offsetOf(nextMonday));

  return {
    key: `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`,
    startsAt: starts,
    endsAt: ends,
  };
}

/** Seria e ditëve me aktivitet gare: rritet nesër, rinis pas një dite pushim. */
export function nextStreak(lastDay: string | null, streak: number, today: string) {
  if (lastDay === today) return streak;
  if (lastDay) {
    const previous = new Date(`${lastDay}T12:00:00Z`);
    const current = new Date(`${today}T12:00:00Z`);
    const gap = Math.round((current.getTime() - previous.getTime()) / 86_400_000);
    if (gap === 1) return streak + 1;
  }
  return 1;
}

/** Arritjet e studentit: kodi, pragu dhe çfarë numërohet. */
export const STUDENT_ACHIEVEMENTS = [
  { code: "comp_first_win", metric: "wins", threshold: 1, icon: "⚔️" },
  { code: "comp_quiz_master", metric: "wins", threshold: 25, icon: "🏆" },
  { code: "comp_battle_veteran", metric: "battles", threshold: 100, icon: "🛡️" },
  { code: "comp_knowledge_contributor", metric: "contributions", threshold: 25, icon: "📚" },
  { code: "comp_university_champion", metric: "points", threshold: 1000, icon: "🎓" },
  { code: "comp_seven_days", metric: "streak", threshold: 7, icon: "🔥" },
  { code: "comp_daily_regular", metric: "daily", threshold: 10, icon: "🧠" },
] as const;

export type AchievementMetric = (typeof STUDENT_ACHIEVEMENTS)[number]["metric"];

/** Arritjet që studenti i ka merituar me këto numra. */
export function earnedAchievements(metrics: Record<AchievementMetric, number>) {
  return STUDENT_ACHIEVEMENTS.filter((achievement) => metrics[achievement.metric] >= achievement.threshold).map(
    (achievement) => achievement.code,
  );
}

/** Pragjet e universitetit që bëhen ngjarje kur kalohen. */
export const UNIVERSITY_MILESTONES = [1000, 5000, 10_000, 25_000, 50_000, 100_000];

export function crossedMilestone(before: number, after: number) {
  return UNIVERSITY_MILESTONES.find((milestone) => before < milestone && after >= milestone) ?? null;
}

/** Zgjedhja e qëndrueshme e pyetjeve të kuizit ditor: e njëjta ditë, të njëjtat pyetje. */
export function seededPick<T>(items: T[], count: number, seed: string): T[] {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  const pool = [...items];
  const picked: T[] = [];
  while (pool.length && picked.length < count) {
    hash = Math.imul(hash ^ picked.length, 16777619);
    picked.push(pool.splice((hash >>> 0) % pool.length, 1)[0]);
  }
  return picked;
}
