import { isPro, type AccessUser } from "./access";

export const ROLES = [
  "student",
  "assistant",
  "professor",
  "org_admin",
  "org_moderator",
  "company",
  "faculty_admin",
  "university_admin",
  "moderator",
  "admin",
  "super_admin",
] as const;

export type Role = (typeof ROLES)[number];

/** Rolet që kanë të drejtë moderimi mbi përmbajtjen e të tjerëve. */
const MODERATION_ROLES: readonly Role[] = [
  "moderator",
  "admin",
  "super_admin",
  "faculty_admin",
  "university_admin",
];

/** Rolet që e shohin panelin e administratorit. */
const ADMIN_ROLES: readonly Role[] = ["admin", "super_admin"];

/** Rolet që japin mësim dhe mund të krijojnë kurse me pagesë. */
const TEACHING_ROLES: readonly Role[] = ["professor", "assistant"];

export type VerificationState = "unverified" | "pending" | "verified" | "rejected";

/**
 * Përdoruesi ashtu si e sheh shtresa e lejeve.
 *
 * Qëllimisht i vogël: sa më pak fusha, aq më pak vende ku mund të gabohet.
 */
export type Actor = AccessUser & {
  role: string;
  verification: VerificationState;
  /** Mosha e llogarisë në ditë. Disa veprime hapen vetëm pas një javë. */
  accountAgeDays: number;
  /** Llogaria e re pret miratimin e ID-së: deri atëherë vetëm shikon. */
  awaitingReview?: boolean;
};

export type Action =
  | "participate"
  | "post"
  | "comment"
  | "upload"
  | "ask"
  | "answer"
  | "message"
  | "message_stranger"
  | "campus_voice"
  | "create_event"
  | "create_group"
  | "create_course"
  | "publish_course"
  | "post_job"
  | "moderate"
  | "verify_material"
  | "review_verification"
  | "manage_ads"
  | "manage_plans"
  | "manage_payouts"
  | "view_admin"
  | "exchange_xp";

export type Feature =
  | "global_feed"
  | "cross_faculty_materials"
  | "unlimited_assistant"
  | "assistant_upload"
  | "offline_downloads"
  | "no_ads"
  | "profile_analytics"
  | "career_boost"
  | "cv_without_watermark"
  | "saved_searches"
  | "extra_storage"
  | "pro_badge"
  // Veçoritë e reja të Pro-s. Secila është e dhënë, jo degë kodi e shpërndarë:
  // kush e lejon një veprim pyetet gjithmonë te `hasFeature`.
  | "public_comments"
  | "post_analytics"
  | "featured_post"
  | "featured_profile"
  | "premium_profile"
  | "pinned_post"
  | "advanced_privacy"
  | "advanced_groups";

/** Veçoritë që hapen vetëm me PRO. Gjithçka tjetër është falas. */
const PRO_FEATURES: readonly Feature[] = [
  "global_feed",
  "cross_faculty_materials",
  "unlimited_assistant",
  "assistant_upload",
  "offline_downloads",
  "no_ads",
  "profile_analytics",
  "career_boost",
  "cv_without_watermark",
  "saved_searches",
  "extra_storage",
  "pro_badge",
  "public_comments",
  "post_analytics",
  "featured_post",
  "featured_profile",
  "premium_profile",
  "pinned_post",
  "advanced_privacy",
  "advanced_groups",
];

/**
 * Sa herë mund të përdoret një veçori Pro brenda një periudhe.
 *
 * Rri këtu, jo nëpër veprime, që kufiri të lexohet në një vend dhe të ndryshojë
 * pa u kërkuar nëpër kod. Veçimi ka kufi sepse pa të tërë feed-i do të ishte
 * postime të veçuara, dhe atëherë veçimi nuk do të thoshte asgjë.
 */
export const PRO_LIMITS = {
  /** Sa postime mund të veçohen njëherësh, dhe sa ditë zgjat veçimi. */
  featuredPosts: 1,
  featuredPostDays: 7,
  /** Sa ditë zgjat veçimi i profilit para se të rinovohet. */
  featuredProfileDays: 30,
  /** Sa grupe mund të hapë një student. Pro-ja i jep më shumë, jo pafund. */
  groupsFree: 3,
  groupsPro: 12,
} as const;

export function role(actor: Pick<Actor, "role"> | null | undefined): Role {
  const value = actor?.role;
  return (ROLES as readonly string[]).includes(value ?? "") ? (value as Role) : "student";
}

export function isModerator(actor: Pick<Actor, "role"> | null | undefined) {
  return MODERATION_ROLES.includes(role(actor));
}

export function isAdmin(actor: Pick<Actor, "role"> | null | undefined) {
  return ADMIN_ROLES.includes(role(actor));
}

export function isTeacher(actor: Pick<Actor, "role"> | null | undefined) {
  return TEACHING_ROLES.includes(role(actor));
}

export type Decision = { allowed: true } | { allowed: false; reason: string };

const ALLOW: Decision = { allowed: true };
const deny = (reason: string): Decision => ({ allowed: false, reason });

export function can(actor: Actor | null | undefined, action: Action): Decision {
  if (!actor) return deny("auth");

  const current = role(actor);
  const verified = actor.verification === "verified";

  /*
    Llogaria që pret miratimin e ID-së vetëm shikon: lexon feed-in, profilet,
    materialet dhe punët, por nuk shkruan asgjë para të tjerëve. Moderimi dhe
    admini nuk preken, sepse ato role nuk jepen kurrë një llogarie të re.
  */
  const watching = Boolean(actor.awaitingReview) && !isModerator(actor);
  const WRITES: readonly Action[] = [
    "participate",
    "post",
    "comment",
    "ask",
    "answer",
    "upload",
    "message",
    "message_stranger",
    "campus_voice",
    "create_event",
    "create_group",
    "create_course",
    "exchange_xp",
  ];
  if (watching && WRITES.includes(action)) return deny("review");

  switch (action) {
    /*
      Kontributi bazë është i hapur për çdo llogari studenti.

      Dikur këtu kërkohej verifikimi, dhe pasoja ishte se një student që sapo
      regjistrohej nuk postonte dot, nuk komentonte dot dhe nuk ngarkonte dot as
      një storje: platforma i dukej e prishur që në minutën e parë. Verifikimi
      mbetet shenjë besimi dhe kusht aty ku anonimiteti ose kontakti me të huaj e
      kërkon vërtet, jo tarifë hyrjeje.
    */
    case "participate":
    case "post":
    case "comment":
    case "ask":
    case "answer":
    case "upload":
    case "message":
    case "create_group":
      return ALLOW;

    // Mesazh te dikush që nuk të njeh: shkon si kërkesë, jo në kutinë e tij.
    case "message_stranger":
      return verified ? ALLOW : deny("verification");

    // Zëri i kampusit: shtatë ditë llogari plus email i verifikuar.
    case "campus_voice":
      if (!verified) return deny("verification");
      return actor.accountAgeDays >= 7 ? ALLOW : deny("account_age");

    // Eventi është njoftim publik me vend dhe datë: aty verifikimi ka kuptim.
    case "create_event":
      return verified ? ALLOW : deny("verification");

    // Kurset me pagesë i krijojnë vetëm profesorët dhe asistentët e verifikuar.
    case "create_course":
      return isTeacher(actor) && verified ? ALLOW : deny("role");

    // Publikimi kalon nga shqyrtimi i platformës, prandaj e bën vetëm moderimi.
    case "publish_course":
      return isModerator(actor) ? ALLOW : deny("role");

    case "post_job":
      return current === "company" || isAdmin(actor) ? ALLOW : deny("role");

    case "moderate":
    case "verify_material":
    case "review_verification":
      return isModerator(actor) ? ALLOW : deny("role");

    case "manage_ads":
    case "manage_plans":
    case "manage_payouts":
    case "view_admin":
      return isAdmin(actor) ? ALLOW : deny("role");

    // Këmbimi i XP-së: llogaritë nën shtatë ditë nuk këmbejnë, që fermat e
    // llogarive të mos prodhojnë PRO falas.
    case "exchange_xp":
      return actor.accountAgeDays >= 7 ? ALLOW : deny("account_age");

    default:
      return deny("unknown");
  }
}

/** A e ka ky përdorues këtë veçori. PRO vendoset një herë, te `isPro`. */
export function hasFeature(
  actor: Actor | null | undefined,
  feature: Feature,
  now: Date = new Date(),
): boolean {
  if (!actor) return false;
  if (!PRO_FEATURES.includes(feature)) return true;
  return isPro(actor, now);
}

/** Ndihmës për UI: lista e veçorive që i mungojnë, për të shpjeguar pse. */
export function missingFeatures(actor: Actor | null | undefined, now: Date = new Date()) {
  return PRO_FEATURES.filter((feature) => !hasFeature(actor, feature, now));
}
