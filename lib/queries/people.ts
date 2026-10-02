import { db } from "@/lib/db";
import { acceptedFollow, FOLLOW_PENDING } from "@/lib/follow";
import { getFollowing, getHiddenPeople } from "./social-graph";

/**
 * Njerëz nga viti yt.
 *
 * Përputhja është akademike dhe e lexueshme, jo algoritëm i fshehtë: i njëjti
 * program peshon më shumë se i njëjti fakultet, dhe i njëjti fakultet më shumë
 * se i njëjti institucion. Gjenerata, pra viti i nisjes, e forcon çdo përputhje.
 */

export type PersonFromYear = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  universityAbbr: string | null;
  programName: string | null;
  facultyName: string | null;
  year: number | null;
  /** none | requested | following */
  relation: "none" | "requested" | "following";
};

type Viewer = {
  id: string;
  universityId: string | null;
  facultyId: string | null;
  studyProgramId: string | null;
  cohortYear: number | null;
  year: number | null;
};

export async function getPeopleFromYourYear(viewer: Viewer, limit = 8, locale = "sq"): Promise<PersonFromYear[]> {
  if (!viewer.universityId && !viewer.facultyId && !viewer.studyProgramId) return [];

  const english = locale === "en";
  const [following, hidden] = await Promise.all([getFollowing(viewer.id), getHiddenPeople(viewer.id)]);

  const excluded = [viewer.id, ...following.ids, ...hidden.all];

  const candidates = await db.user.findMany({
    where: {
      id: { notIn: excluded },
      onboardedAt: { not: null },
      role: "student",
      OR: [
        viewer.studyProgramId ? { studyProgramId: viewer.studyProgramId } : {},
        viewer.facultyId ? { facultyId: viewer.facultyId } : {},
        viewer.universityId ? { universityId: viewer.universityId } : {},
      ].filter((clause) => Object.keys(clause).length > 0),
    },
    take: 60,
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
      year: true,
      cohortYear: true,
      universityId: true,
      facultyId: true,
      studyProgramId: true,
      featuredUntil: true,
      university: { select: { abbr: true } },
      faculty: { select: { name: true, nameEn: true } },
      studyProgram: { select: { name: true, nameEn: true } },
    },
  });

  // Kërkesat e dërguara nuk duhet të duken si «Ndiqe» i pashtypur.
  const pending = await db.follow.findMany({
    where: { followerId: viewer.id, followingId: { in: candidates.map((row) => row.id) }, status: FOLLOW_PENDING },
    select: { followingId: true },
  });
  const requested = new Set(pending.map((row) => row.followingId));

  const scored = candidates.map((person) => {
    let score = 0;
    if (viewer.studyProgramId && person.studyProgramId === viewer.studyProgramId) score += 50;
    if (viewer.facultyId && person.facultyId === viewer.facultyId) score += 20;
    if (viewer.universityId && person.universityId === viewer.universityId) score += 10;
    if (viewer.cohortYear && person.cohortYear === viewer.cohortYear) score += 15;
    if (viewer.year && person.year === viewer.year) score += 8;

    // Profili i veçuar me Pro ngrihet brenda atyre që dalin gjithsesi, jo mbi to.
    if (person.featuredUntil && person.featuredUntil.getTime() > Date.now()) score += 12;

    return { person, score };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.person.name.localeCompare(b.person.name, "sq"))
    .slice(0, limit)
    .map(({ person }) => ({
      id: person.id,
      name: person.name,
      username: person.username,
      avatar: person.avatar,
      universityAbbr: person.university?.abbr ?? null,
      programName: person.studyProgram
        ? english
          ? person.studyProgram.nameEn
          : person.studyProgram.name
        : null,
      facultyName: person.faculty ? (english ? person.faculty.nameEn : person.faculty.name) : null,
      year: person.year,
      relation: requested.has(person.id) ? "requested" : "none",
    }));
}

/** Sa kërkesa ndjekjeje presin vendimin e këtij studenti. */
export async function countPendingRequests(userId: string) {
  return db.follow.count({ where: { followingId: userId, status: FOLLOW_PENDING } });
}

/** Kërkimi i njerëzve me emër, mbiemër ose emër përdoruesi. */
export async function searchPeople(viewerId: string, query: string, take = 12) {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];

  const rows = await db.user.findMany({
    where: {
      id: { not: viewerId },
      OR: [
        { username: { contains: needle } },
        { name: { contains: needle } },
        { firstName: { contains: needle } },
        { lastName: { contains: needle } },
      ],
    },
    take,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
      isPrivate: true,
      faculty: { select: { name: true, nameEn: true } },
      studyProgram: { select: { name: true, nameEn: true } },
      followers: { where: { followerId: viewerId, ...acceptedFollow }, select: { id: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    username: row.username,
    avatar: row.avatar,
    isPrivate: row.isPrivate,
    facultyName: row.faculty?.name ?? null,
    programName: row.studyProgram?.name ?? null,
    following: row.followers.length > 0,
  }));
}
