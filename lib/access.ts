
import { POST_SCOPES, PRO_ONLY_SCOPES, type PostScope } from "@/lib/types";

/** Forma minimale e përdoruesit që i duhet çdo vendimi qasjeje. */
export type AccessUser = {
  id: string;
  role: string;
  universityId: string | null;
  facultyId: string | null;
  /** Ditë Pro të fituara nga kontributi, të pashpenzuara. */
  proEarnedUntil?: Date | null;
  /** Abonimi aktiv, nëse ka. */
  subscriptions?: { status: string; expiresAt: Date }[];
  /** Lëndët ku është i regjistruar. */
  enrollments?: { courseId: string }[];
};

/** Forma minimale e materialit që i duhet vendimit. */
export type AccessMaterial = {
  id: string;
  courseId: string;
  isHidden: boolean;
  uploaderId?: string;
  course: {
    department: {
      facultyId: string;
      faculty: { universityId: string };
    };
  };
};

export type AccessReason = "own-course" | "own-faculty" | "own-upload" | "pro" | "locked";

export type AccessDecision = {
  allowed: boolean;
  reason: AccessReason;
};

// ---------------------------------------------------------------------------
// Pro
// ---------------------------------------------------------------------------

export function isPro(user: AccessUser | null | undefined, now: Date = new Date()): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;

  if (user.proEarnedUntil && user.proEarnedUntil.getTime() > now.getTime()) return true;

  return (user.subscriptions ?? []).some(
    (subscription) =>
      subscription.status === "active" && subscription.expiresAt.getTime() > now.getTime(),
  );
}

/** Data deri kur zgjat Pro-ja, ose null. Përdoret nga UI për të treguar mbetjen. */
export function proExpiresAt(
  user: AccessUser | null | undefined,
  now: Date = new Date(),
): Date | null {
  if (!user) return null;

  const candidates: Date[] = [];
  if (user.proEarnedUntil && user.proEarnedUntil.getTime() > now.getTime()) {
    candidates.push(user.proEarnedUntil);
  }
  for (const subscription of user.subscriptions ?? []) {
    if (subscription.status === "active" && subscription.expiresAt.getTime() > now.getTime()) {
      candidates.push(subscription.expiresAt);
    }
  }

  if (candidates.length === 0) return null;
  return candidates.reduce((latest, item) => (item > latest ? item : latest));
}

// ---------------------------------------------------------------------------
// Rrethet
// ---------------------------------------------------------------------------

function facultyOf(material: AccessMaterial) {
  return material.course.department.facultyId;
}

/**
 * Fakultetet të cilave përdoruesi u ka qasje falas. Është gjithmonë vetëm i
 * veti: rrethi 3 dhe 4 hapen me Pro, jo me listë më të gjatë.
 */
export function freeFacultyIds(user: AccessUser | null | undefined): string[] {
  return user?.facultyId ? [user.facultyId] : [];
}

export function canViewMaterial(
  user: AccessUser | null | undefined,
  material: AccessMaterial,
  now: Date = new Date(),
): AccessDecision {
  if (material.isHidden) return { allowed: false, reason: "locked" };
  if (!user) return { allowed: false, reason: "locked" };

  // Materiali yt është gjithmonë i yti, edhe nëse ndërron fakultet.
  if (material.uploaderId && material.uploaderId === user.id) {
    return { allowed: true, reason: "own-upload" };
  }

  // Rrethi 1: lëndët ku jam i regjistruar.
  if ((user.enrollments ?? []).some((item) => item.courseId === material.courseId)) {
    return { allowed: true, reason: "own-course" };
  }

  // Rrethi 2: i tërë fakulteti im, nga viti I deri në master.
  if (user.facultyId && facultyOf(material) === user.facultyId) {
    return { allowed: true, reason: "own-faculty" };
  }

  // Rrethi 3 dhe 4: vetëm me Pro.
  if (isPro(user, now)) return { allowed: true, reason: "pro" };

  return { allowed: false, reason: "locked" };
}

/**
 * Shkarkimi ndjek pikërisht të njëjtin rregull si shikimi. Nuk ka rast ku dikush
 * e sheh një material të plotë por nuk e shkarkon dot.
 */
export function canDownloadMaterial(
  user: AccessUser | null | undefined,
  material: AccessMaterial,
  now: Date = new Date(),
): AccessDecision {
  return canViewMaterial(user, material, now);
}

export function canPostWithScope(
  user: AccessUser | null | undefined,
  scope: PostScope,
  now: Date = new Date(),
): AccessDecision {
  if (!user) return { allowed: false, reason: "locked" };
  if (!PRO_ONLY_SCOPES.includes(scope)) return { allowed: true, reason: "own-faculty" };
  if (isPro(user, now)) return { allowed: true, reason: "pro" };
  return { allowed: false, reason: "locked" };
}

/** Shtrirjet e lejuara, për ta ndërtuar zgjedhësin pa e kopjuar rregullin. */
export function allowedScopes(
  user: AccessUser | null | undefined,
  now: Date = new Date(),
): { scope: PostScope; allowed: boolean }[] {
  return POST_SCOPES.map((scope) => ({
    scope,
    allowed: canPostWithScope(user, scope, now).allowed,
  }));
}

// ---------------------------------------------------------------------------
// Filtrat e query-ve
// ---------------------------------------------------------------------------

/** Filtri i Prisma-s për materialet që përdoruesi mund t'i HAPË. */
export function materialAccessFilter(user: AccessUser | null | undefined, now: Date = new Date()) {
  if (!user) return { id: "__none__" };
  if (isPro(user, now)) return { isHidden: false };

  const courseIds = (user.enrollments ?? []).map((item) => item.courseId);

  return {
    isHidden: false,
    OR: [
      { uploaderId: user.id },
      ...(courseIds.length > 0 ? [{ courseId: { in: courseIds } }] : []),
      ...(user.facultyId
        ? [{ course: { department: { facultyId: user.facultyId } } }]
        : []),
    ],
  };
}

/**
 * Ia bashkëngjit çdo materiali vendimin e qasjes, pa e hequr nga lista.
 * Kjo është forma që përdor biblioteka dhe kërkimi.
 */
export function decorateMaterials<T extends AccessMaterial>(
  user: AccessUser | null | undefined,
  materials: T[],
  now: Date = new Date(),
): (T & { access: AccessDecision })[] {
  return materials.map((material) => ({
    ...material,
    access: canViewMaterial(user, material, now),
  }));
}

/** Filtri i postimeve që duhet të arrijnë te ky përdorues sipas shtrirjes. */
export function postScopeFilter(user: AccessUser | null | undefined) {
  if (!user) return { id: "__none__" };

  const courseIds = (user.enrollments ?? []).map((item) => item.courseId);

  return {
    isHidden: false,
    OR: [
      { scope: "national" },
      ...(user.universityId ? [{ scope: "university", universityId: user.universityId }] : []),
      ...(user.facultyId ? [{ scope: { in: ["faculty", "generation"] }, facultyId: user.facultyId }] : []),
      ...(courseIds.length > 0 ? [{ scope: "course", courseId: { in: courseIds } }] : []),
      // «Vetëm ndjekësit»: e sheh kush e ndjek autorin, dhe ndjekja duhet pranuar.
      { scope: "followers", author: { followers: { some: { followerId: user.id, status: "accepted" } } } },
      { authorId: user.id },
    ],
  };
}

/** Reklamat nuk u shfaqen kurrë përdoruesve Pro. */
export function shouldSeeAds(user: AccessUser | null | undefined, now: Date = new Date()) {
  return Boolean(user) && !isPro(user, now);
}

// ---------------------------------------------------------------------------
// Kufijtë e asistentit AI
// ---------------------------------------------------------------------------

/*
  Kufijtë e asistentit, si konfigurim.

  Rrinë këtu, jo nëpër ndërfaqe: një numër i ngulitur te një buton do të thoshte
  se ndryshimi i tij kërkon kërkim nëpër kod. `web` do të thotë se kërkesa mund
  të mbështetet edhe me burime nga interneti, kur ofruesi është i konfiguruar.
*/
export const AI_LIMITS = {
  free: { messagesPerDay: 10, historyDays: 7, uploads: false, web: false },
  pro: { messagesPerDay: 200, historyDays: 3650, uploads: true, web: true },
} as const;

export function aiLimits(user: AccessUser | null | undefined, now: Date = new Date()) {
  return isPro(user, now) ? AI_LIMITS.pro : AI_LIMITS.free;
}

export const OFFLINE_DOWNLOAD_LIMIT = 50;

export function canDownloadOffline(user: AccessUser | null | undefined, now: Date = new Date()) {
  return isPro(user, now);
}
