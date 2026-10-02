/**
 * Tipet e mbyllura. Baza i ruan si String sepse skema mbetet e bartshme mes
 * SQLite dhe PostgreSQL, prandaj i vetmi burim i së vërtetës është ky skedar.
 *
 * Etiketat nuk rrinë këtu: ato jetojnë te `messages/*.json`, sepse çdo tekst i
 * dukshëm kalon nëpër next-intl.
 */

export const POST_TYPES = [
  "text",
  "question",
  "material",
  "poll",
  "event",
  "seek",
  "campus_voice",
] as const;
export type PostType = (typeof POST_TYPES)[number];

/**
 * Kush e sheh postimin.
 *
 * Katër zgjedhje, sepse më shumë se kaq askush nuk i lexon: fakulteti,
 * universiteti, tërë Kosova, ose vetëm ndjekësit. «Lënda ime» dhe «Gjenerata
 * ime» u hoqën, sepse ndanin të njëjtin fakultet dhe studenti nuk e dinte kurrë
 * se cilën po zgjidhte.
 */
export const POST_SCOPES = [
  "faculty",
  "university",
  "national",
  "followers",
] as const;
export type PostScope = (typeof POST_SCOPES)[number];

export const PRO_ONLY_SCOPES: readonly PostScope[] = ["university", "national"];

export const REACTION_TYPES = ["like"] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export const MATERIAL_TYPES = [
  "lecture",
  "script",
  "notes",
  "past_exam",
  "solved",
  "slides",
  "book",
  "video",
] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const VERIFICATION_STATUSES = ["pending", "verified", "rejected", "hidden"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const STUDY_LEVELS = ["bachelor", "master", "phd"] as const;
export type StudyLevel = (typeof STUDY_LEVELS)[number];

export const EVENT_KINDS = [
  "lecture",
  "exam",
  "fair",
  "party",
  "contest",
  "workshop",
  "study_together",
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const JOB_TYPES = [
  "internship",
  "part_time",
  "full_time",
  "scholarship",
  "contest",
  "exchange",
  "hackathon",
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const REPORT_REASONS = [
  "harassment",
  "hate",
  "targeting",
  "sexual",
  "threat",
  "spam",
  "personal_data",
  "copyright",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const USER_ROLES = ["student", "moderator", "admin", "company"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const AI_MODES = [
  "chat",
  "explain",
  "summarize",
  "quiz",
  "flashcards",
  "exam_plan",
  "translate",
  "proofread",
] as const;
export type AiMode = (typeof AI_MODES)[number];

export const NOTIFICATION_CATEGORIES = [
  "social",
  "academic",
  "progress",
  "jobs",
  "system",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const INTEREST_KEYS = [
  "programming",
  "design",
  "music",
  "sport",
  "entrepreneurship",
  "volunteering",
  "languages",
  "photography",
  "gaming",
  "literature",
  "activism",
] as const;
export type InterestKey = (typeof INTEREST_KEYS)[number];

/** Komunat e Kosovës: një burim i vetëm, te `lib/kosovo-places.ts`. */
export { KOSOVO_MUNICIPALITIES as KOSOVO_CITIES } from "./kosovo-places";

/**
 * Emaili studentor: lista dhe burimet rrinë te `lib/student-domains.ts`.
 * Domeni nuk jep vetë shenjën: ajo vjen pasi admini miraton ID-në.
 */
export { isStudentEmail as isInstitutionalEmail } from "./student-domains";

export const MIN_AGE = 16;
export const ACADEMIC_YEAR = "2025/26";
