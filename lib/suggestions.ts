import { db, parseList } from "@/lib/db";
import { acceptedFollow } from "@/lib/follow";
import { cachedBy } from "@/lib/cache";

/**
 * Motori i sugjerimeve dhe i kontekstit të përbashkët.
 *
 * Rregull i palëvizshëm: kurrë mos shfaq profil pa arsye të shkruar. Ai rresht i
 * vogël nën emrin, jo fotoja, është ajo që e bind dikë ta pranojë ndjekjen.
 */
export const SUGGESTION_WEIGHTS = {
  sharedCourse: 5,
  sameFacultyYear: 4,
  mutualFriend: 3,
  sameCity: 2,
  sameHighSchool: 2,
  sharedInterest: 1,
} as const;

/** Arsyet vijnë si çelësa plus vlera, që përkthimi të bëhet te komponenti. */
export type ContextReason = { key: string; values?: Record<string, string | number> };

export type SuggestedPerson = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  isVerified: boolean;
  isPro: boolean;
  universityAbbr: string | null;
  facultyCode: string | null;
  facultyLabel: string | null;
  year: number | null;
  score: number;
  reasons: ContextReason[];
};

export function describeContext(input: {
  sharedCourses: number;
  mutualFriends: number;
  sameFacultyYear: boolean;
  facultyLabel?: string | null;
  year?: number | null;
  sameCity: boolean;
  city?: string | null;
  sharedInterests: string[];
  sameHighSchool: boolean;
}): ContextReason[] {
  const reasons: ContextReason[] = [];

  if (input.sharedCourses > 0) {
    reasons.push({
      key: input.sharedCourses === 1 ? "sharedCourseOne" : "sharedCourses",
      values: { count: input.sharedCourses },
    });
  }
  if (input.mutualFriends > 0) {
    reasons.push({
      key: input.mutualFriends === 1 ? "mutualFriendOne" : "mutualFriends",
      values: { count: input.mutualFriends },
    });
  }
  if (input.sameFacultyYear && input.facultyLabel && input.year) {
    reasons.push({
      key: "sameFacultyYear",
      values: { faculty: input.facultyLabel, year: input.year },
    });
  }
  if (input.sameHighSchool) reasons.push({ key: "sameHighSchool" });
  if (input.sameCity && input.city) reasons.push({ key: "sameCity", values: { city: input.city } });
  if (input.sharedInterests.length > 0) {
    reasons.push({
      key: "sharedInterests",
      values: { interests: input.sharedInterests.slice(0, 2).join(", ") },
    });
  }

  return reasons;
}

const PERSON_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
  bio: true,
  isVerified: true,
  year: true,
  city: true,
  highSchool: true,
  interests: true,
  facultyId: true,
  proEarnedUntil: true,
  role: true,
  universityId: true,
  university: { select: { abbr: true } },
  faculty: { select: { name: true, nameEn: true, color: true } },
  enrollments: { select: { courseId: true } },
  subscriptions: { where: { status: "active" }, select: { status: true, expiresAt: true } },
} as const;

/**
 * Sugjerimet janë personale, por nuk ndryshojnë brenda minutës.
 *
 * Llogaritja e tyre kushton disa pyetje, dhe çdo pyetje e paguan udhëtimin deri
 * te baza. Prandaj rezultati mbahet dhjetë minuta për secilin student.
 */
export async function getSuggestedPeople(
  userId: string,
  limit = 12,
  options: { courseId?: string; locale?: string; excludeIds?: string[] } = {},
): Promise<SuggestedPerson[]> {
  // Çelësi mban çdo gjë që e ndryshon rezultatin, që një listë e ruajtur të mos
  // dalë te një kontekst tjetër.
  const key = [userId, String(limit), options.courseId ?? "", options.locale ?? "sq", (options.excludeIds ?? []).join(",")];
  return cachedBy(() => computeSuggestedPeople(userId, limit, options), ["sugjerimet", ...key], {
    revalidate: 600,
  })();
}

async function computeSuggestedPeople(
  userId: string,
  limit: number,
  options: { courseId?: string; locale?: string; excludeIds?: string[] },
): Promise<SuggestedPerson[]> {
  const me = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      universityId: true,
      facultyId: true,
      year: true,
      city: true,
      highSchool: true,
      interests: true,
      enrollments: { select: { courseId: true } },
      following: { select: { followingId: true } },
      blocksMade: { select: { blockedId: true } },
      blocksTaken: { select: { blockerId: true } },
    },
  });
  if (!me) return [];

  const myCourses = new Set(me.enrollments.map((item) => item.courseId));
  const myFollowing = new Set(me.following.map((item) => item.followingId));
  const myInterests = new Set(parseList(me.interests));
  const excluded = new Set<string>([
    me.id,
    ...myFollowing,
    ...me.blocksMade.map((item) => item.blockedId),
    ...me.blocksTaken.map((item) => item.blockerId),
    ...(options.excludeIds ?? []),
  ]);

  const secondDegree = await db.follow.findMany({
    where: { ...acceptedFollow, followerId: { in: [...myFollowing] } },
    select: { followingId: true },
  });
  const mutualCount = new Map<string, number>();
  for (const edge of secondDegree) {
    mutualCount.set(edge.followingId, (mutualCount.get(edge.followingId) ?? 0) + 1);
  }

  const candidates = await db.user.findMany({
    where: {
      id: { notIn: [...excluded] },
      role: "student",
      onboardedAt: { not: null },
      ...(me.universityId ? { universityId: me.universityId } : {}),
      ...(options.courseId ? { enrollments: { some: { courseId: options.courseId } } } : {}),
    },
    select: PERSON_SELECT,
    take: 400,
  });

  const english = options.locale === "en";
  const now = new Date();

  const scored = candidates.map((candidate) => {
    const sharedCourses = candidate.enrollments.filter((item) => myCourses.has(item.courseId)).length;
    const sameFacultyYear =
      Boolean(me.facultyId) && candidate.facultyId === me.facultyId && candidate.year === me.year;
    const mutualFriends = mutualCount.get(candidate.id) ?? 0;
    const sameCity = Boolean(me.city) && candidate.city === me.city;
    const sameHighSchool = Boolean(me.highSchool) && candidate.highSchool === me.highSchool;
    const sharedInterests = parseList(candidate.interests).filter((item) => myInterests.has(item));

    const score =
      sharedCourses * SUGGESTION_WEIGHTS.sharedCourse +
      (sameFacultyYear ? SUGGESTION_WEIGHTS.sameFacultyYear : 0) +
      Math.min(mutualFriends, 5) * SUGGESTION_WEIGHTS.mutualFriend +
      (sameCity ? SUGGESTION_WEIGHTS.sameCity : 0) +
      (sameHighSchool ? SUGGESTION_WEIGHTS.sameHighSchool : 0) +
      Math.min(sharedInterests.length, 3) * SUGGESTION_WEIGHTS.sharedInterest;

    const facultyLabel = candidate.faculty
      ? english
        ? candidate.faculty.nameEn
        : candidate.faculty.name
      : null;

    return {
      id: candidate.id,
      name: candidate.name,
      username: candidate.username,
      avatar: candidate.avatar,
      bio: candidate.bio,
      isVerified: candidate.isVerified,
      isPro:
        Boolean(candidate.proEarnedUntil && candidate.proEarnedUntil > now) ||
        candidate.subscriptions.some((item) => item.expiresAt > now),
      universityAbbr: candidate.university?.abbr ?? null,
      facultyCode: candidate.faculty?.color ?? null,
      facultyLabel,
      year: candidate.year,
      score,
      reasons: describeContext({
        sharedCourses,
        mutualFriends,
        sameFacultyYear,
        facultyLabel,
        year: candidate.year,
        sameCity,
        city: candidate.city,
        sharedInterests,
        sameHighSchool,
      }),
    };
  });

  return scored
    .filter((person) => person.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "sq"))
    .slice(0, limit);
}

/** Konteksti i përbashkët mes dy personave, për kudo ku duket një profil. */
export async function getMutualContext(
  viewerId: string,
  targetId: string,
  locale = "sq",
): Promise<ContextReason[]> {
  if (viewerId === targetId) return [];

  const [viewer, target] = await Promise.all([
    db.user.findUnique({
      where: { id: viewerId },
      select: {
        facultyId: true,
        year: true,
        city: true,
        highSchool: true,
        interests: true,
        enrollments: { select: { courseId: true } },
        following: { select: { followingId: true } },
      },
    }),
    db.user.findUnique({
      where: { id: targetId },
      select: {
        facultyId: true,
        year: true,
        city: true,
        highSchool: true,
        interests: true,
        faculty: { select: { name: true, nameEn: true } },
        enrollments: { select: { courseId: true } },
        followers: { select: { followerId: true } },
      },
    }),
  ]);
  if (!viewer || !target) return [];

  const myCourses = new Set(viewer.enrollments.map((item) => item.courseId));
  const myFollowing = new Set(viewer.following.map((item) => item.followingId));

  return describeContext({
    sharedCourses: target.enrollments.filter((item) => myCourses.has(item.courseId)).length,
    mutualFriends: target.followers.filter((item) => myFollowing.has(item.followerId)).length,
    sameFacultyYear:
      Boolean(viewer.facultyId) &&
      viewer.facultyId === target.facultyId &&
      viewer.year === target.year,
    facultyLabel: target.faculty ? (locale === "en" ? target.faculty.nameEn : target.faculty.name) : null,
    year: target.year,
    sameCity: Boolean(viewer.city) && viewer.city === target.city,
    city: target.city,
    sharedInterests: parseList(target.interests).filter((item) =>
      parseList(viewer.interests).includes(item),
    ),
    sameHighSchool: Boolean(viewer.highSchool) && viewer.highSchool === target.highSchool,
  });
}
