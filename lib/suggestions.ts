import { db, parseList } from "@/lib/db";
import { YEAR_LABELS } from "@/lib/constants";

/**
 * Motori i sugjerimeve. Peshat vijnë nga hapi i tetë i onboarding-ut dhe
 * përdoren kudo: në feed, në Kampus dhe te faqja e lëndës.
 *
 * Rregull i palëvizshëm: kurrë mos shfaq profil pa arsye të shkruar. Arsyeja e
 * dukshme është ajo që e rrit pranimin e ndjekjes, jo fotoja.
 */
export const SUGGESTION_WEIGHTS = {
  sharedCourse: 5,
  sameFacultyYear: 4,
  mutualFriend: 3,
  sameCity: 2,
  sharedInterest: 1,
  sameHighSchool: 2,
} as const;

export type SuggestedPerson = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  isVerified: boolean;
  facultyName: string | null;
  facultyColor: string | null;
  year: number | null;
  city: string | null;
  score: number;
  /** Arsyeja kryesore, e para që shfaqet nën emër. */
  reason: string;
  reasons: string[];
};

function shortFaculty(name: string | null | undefined) {
  if (!name) return null;
  return name.replace("Fakulteti i ", "").replace("Fakulteti ", "");
}

export function describeContext(input: {
  sharedCourses: number;
  mutualFriends: number;
  sameFacultyYear: boolean;
  facultyName?: string | null;
  year?: number | null;
  sameCity: boolean;
  city?: string | null;
  sharedInterests: string[];
  sameHighSchool: boolean;
}): string[] {
  const reasons: string[] = [];

  if (input.sharedCourses > 0) {
    reasons.push(
      input.sharedCourses === 1
        ? "1 lëndë e përbashkët"
        : `${input.sharedCourses} lëndë të përbashkëta`,
    );
  }
  if (input.mutualFriends > 0) {
    reasons.push(
      input.mutualFriends === 1 ? "1 shok i përbashkët" : `${input.mutualFriends} shokë të përbashkët`,
    );
  }
  if (input.sameFacultyYear && input.facultyName && input.year) {
    reasons.push(
      `Të dy në ${shortFaculty(input.facultyName)}, ${YEAR_LABELS[input.year]?.toLowerCase() ?? `viti ${input.year}`}`,
    );
  }
  if (input.sameHighSchool) {
    reasons.push("Nga e njëjta shkollë e mesme");
  }
  if (input.sameCity && input.city) {
    reasons.push(`Nga ${input.city} si ti`);
  }
  if (input.sharedInterests.length > 0) {
    reasons.push(`Interesa të njëjta: ${input.sharedInterests.slice(0, 2).join(", ")}`);
  }

  return reasons;
}

export async function getSuggestedPeople(
  userId: string,
  limit = 12,
  options: { courseId?: string; excludeIds?: string[] } = {},
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

  // Shokët e shokëve: kush ndiqet nga ata që i ndjek unë.
  const secondDegree = await db.follow.findMany({
    where: { followerId: { in: [...myFollowing] } },
    select: { followingId: true },
  });
  const mutualFriendCount = new Map<string, number>();
  for (const edge of secondDegree) {
    mutualFriendCount.set(edge.followingId, (mutualFriendCount.get(edge.followingId) ?? 0) + 1);
  }

  const candidates = await db.user.findMany({
    where: {
      id: { notIn: [...excluded] },
      role: "student",
      onboardedAt: { not: null },
      ...(me.universityId ? { universityId: me.universityId } : {}),
      ...(options.courseId ? { enrollments: { some: { courseId: options.courseId } } } : {}),
    },
    select: {
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
      faculty: { select: { name: true, color: true } },
      enrollments: { select: { courseId: true } },
    },
    take: 400,
  });

  const scored: SuggestedPerson[] = candidates.map((candidate) => {
    const sharedCourses = candidate.enrollments.filter((item) =>
      myCourses.has(item.courseId),
    ).length;
    const sameFacultyYear =
      Boolean(me.facultyId) &&
      candidate.facultyId === me.facultyId &&
      candidate.year === me.year;
    const mutualFriends = mutualFriendCount.get(candidate.id) ?? 0;
    const sameCity = Boolean(me.city) && candidate.city === me.city;
    const sameHighSchool = Boolean(me.highSchool) && candidate.highSchool === me.highSchool;
    const sharedInterests = parseList(candidate.interests).filter((interest) =>
      myInterests.has(interest),
    );

    const score =
      sharedCourses * SUGGESTION_WEIGHTS.sharedCourse +
      (sameFacultyYear ? SUGGESTION_WEIGHTS.sameFacultyYear : 0) +
      Math.min(mutualFriends, 5) * SUGGESTION_WEIGHTS.mutualFriend +
      (sameCity ? SUGGESTION_WEIGHTS.sameCity : 0) +
      (sameHighSchool ? SUGGESTION_WEIGHTS.sameHighSchool : 0) +
      Math.min(sharedInterests.length, 3) * SUGGESTION_WEIGHTS.sharedInterest;

    const reasons = describeContext({
      sharedCourses,
      mutualFriends,
      sameFacultyYear,
      facultyName: candidate.faculty?.name,
      year: candidate.year,
      sameCity,
      city: candidate.city,
      sharedInterests,
      sameHighSchool,
    });

    return {
      id: candidate.id,
      name: candidate.name,
      username: candidate.username,
      avatar: candidate.avatar,
      bio: candidate.bio,
      isVerified: candidate.isVerified,
      facultyName: candidate.faculty?.name ?? null,
      facultyColor: candidate.faculty?.color ?? null,
      year: candidate.year,
      city: candidate.city,
      score,
      reason: reasons[0] ?? "Nga universiteti yt",
      reasons,
    };
  });

  return scored
    .filter((person) => person.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "sq"))
    .slice(0, limit);
}

/**
 * Konteksti i përbashkët mes dy personave. Shfaqet kudo ku duket një person:
 * kartë, listë, profil, koment.
 */
export async function getMutualContext(viewerId: string, targetId: string): Promise<string[]> {
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
        faculty: { select: { name: true } },
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
    facultyName: target.faculty?.name,
    year: target.year,
    sameCity: Boolean(viewer.city) && viewer.city === target.city,
    city: target.city,
    sharedInterests: parseList(target.interests).filter((interest) =>
      parseList(viewer.interests).includes(interest),
    ),
    sameHighSchool: Boolean(viewer.highSchool) && viewer.highSchool === target.highSchool,
  });
}
