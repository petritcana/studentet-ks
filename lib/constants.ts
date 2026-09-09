/**
 * Tipet e mbyllura dhe etiketat e tyre në shqip. Baza i ruan si String sepse
 * SQLite s'ka enum, prandaj e vetmja burim i vërtetë është ky skedar.
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

export const POST_TYPE_LABELS: Record<PostType, string> = {
  text: "Postim",
  question: "Pyetje",
  material: "Material",
  poll: "Sondazh",
  event: "Event",
  seek: "Kërkoj ose ofroj",
  campus_voice: "Zëri i kampusit",
};

export const POST_TYPE_HINTS: Record<PostType, string> = {
  text: "Diçka që do ta dinte gjenerata jote.",
  question: "Pyet për një lëndë. Përgjigjet vijnë nga ata që e kanë kaluar.",
  material: "Skripta, shënime, provime të kaluara ose detyra të zgjidhura.",
  poll: "Deri në katër opsione, rezultatet shihen menjëherë.",
  event: "Datë, vend dhe RSVP. Studio bashkë hyn këtu.",
  seek: "Bashkëstudent për projekt, repeticione ose banesë me bashkëqiramarrës.",
  campus_voice: "Anonim publikisht. Pa emra, pa foto njerëzish.",
};

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

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  lecture: "Ligjëratë",
  script: "Skriptë",
  notes: "Shënime studentore",
  past_exam: "Provim i kaluar",
  solved: "Detyra të zgjidhura",
  slides: "Prezantim",
  book: "Libër",
  video: "Video",
};

export const VERIFICATION_STATUSES = ["pending", "verified", "rejected", "hidden"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  pending: "Pa verifikuar ende",
  verified: "I verifikuar",
  rejected: "I refuzuar",
  hidden: "I fshehur për rishikim",
};

export const STUDY_LEVELS = ["bachelor", "master", "phd"] as const;
export type StudyLevel = (typeof STUDY_LEVELS)[number];

export const STUDY_LEVEL_LABELS: Record<StudyLevel, string> = {
  bachelor: "Bachelor",
  master: "Master",
  phd: "Doktoraturë",
};

export const YEAR_LABELS: Record<number, string> = {
  1: "Viti I",
  2: "Viti II",
  3: "Viti III",
  4: "Viti IV",
};

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

export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  lecture: "Ligjëratë",
  exam: "Afat provimi",
  fair: "Panair pune",
  party: "Aheng",
  contest: "Garë",
  workshop: "Workshop",
  study_together: "Studio bashkë",
};

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

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  internship: "Praktikë",
  part_time: "Punë me gjysmë orari",
  full_time: "Punë me orar të plotë",
  scholarship: "Bursë",
  contest: "Konkurs",
  exchange: "Shkëmbim",
  hackathon: "Hackathon",
};

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

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: "Ngacmim",
  hate: "Gjuhë urrejtjeje",
  targeting: "Targetim i një individi",
  sexual: "Përmbajtje seksuale",
  threat: "Kërcënim",
  spam: "Spam",
  personal_data: "Të dhëna personale",
  copyright: "Të drejta autoriale",
  other: "Tjetër",
};

export const INTERESTS = [
  "programim",
  "dizajn",
  "muzikë",
  "sport",
  "sipërmarrësi",
  "vullnetarizëm",
  "gjuhë",
  "fotografi",
  "gaming",
  "letërsi",
  "aktivizëm",
] as const;

export const KOSOVO_CITIES = [
  "Prishtinë",
  "Prizren",
  "Pejë",
  "Gjakovë",
  "Gjilan",
  "Mitrovicë",
  "Ferizaj",
  "Vushtrri",
  "Podujevë",
  "Suharekë",
  "Rahovec",
  "Malishevë",
  "Lipjan",
  "Skenderaj",
  "Drenas",
  "Kaçanik",
  "Deçan",
  "Istog",
  "Klinë",
  "Viti",
] as const;

export const DAY_LABELS: Record<number, string> = {
  1: "E hënë",
  2: "E martë",
  3: "E mërkurë",
  4: "E enjte",
  5: "E premte",
  6: "E shtunë",
  7: "E diel",
};

export const DAY_LABELS_SHORT: Record<number, string> = {
  1: "Hën",
  2: "Mar",
  3: "Mër",
  4: "Enj",
  5: "Pre",
  6: "Sht",
  7: "Die",
};

/** Mosha minimale për të përdorur platformën. */
export const MIN_AGE = 16;

/** Domenet që japin badge-in "I verifikuar" automatikisht. */
export const INSTITUTIONAL_EMAIL_DOMAINS = [
  "student.uni-pr.edu",
  "uni-pr.edu",
  "ubt-uni.net",
  "aab-edu.net",
  "rit.edu",
  "uni-prizren.com",
  "uni-gjk.org",
  "unhz.eu",
  "umib.net",
  "ushaf.net",
] as const;

export function isInstitutionalEmail(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return INSTITUTIONAL_EMAIL_DOMAINS.some(
    (allowed) => domain === allowed || domain.endsWith(`.${allowed}`),
  );
}
