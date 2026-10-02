import "server-only";

import { db } from "@/lib/db";
import { weekOf } from "./rules";

/**
 * Renditjet e studentëve.
 *
 * Llogariten nga regjistri i pikëve, vetëm te serveri. Shfaqen njëzet të parët dhe
 * vendi i shikuesit, kurrë fundi i listës: renditja është nxitje, jo turp.
 */
export type StudentScope = "global" | "university" | "faculty" | "program" | "year";
export type Period = "today" | "week" | "month" | "all";

export const STUDENT_SCOPES: StudentScope[] = ["global", "university", "faculty", "program", "year"];
export const PERIODS: Period[] = ["today", "week", "month", "all"];

export function periodStart(period: Period, now: Date = new Date()): Date | undefined {
  if (period === "all") return undefined;
  if (period === "week") return weekOf(now).startsAt;
  if (period === "month") return new Date(now.getTime() - 30 * 86_400_000);
  return new Date(now.getTime() - 24 * 3_600_000);
}

type Viewer = {
  id: string;
  universityId: string | null;
  facultyId: string | null;
  studyProgramId?: string | null;
  year: number | null;
};

export type StudentRow = {
  rank: number;
  userId: string;
  name: string;
  username: string;
  avatar: string | null;
  isVerified: boolean;
  university: string | null;
  points: number;
  wins: number;
  battles: number;
  achievements: number;
};

function scopeFilter(scope: StudentScope, viewer: Viewer) {
  if (scope === "university") return viewer.universityId ? { universityId: viewer.universityId } : null;
  if (scope === "faculty") return viewer.facultyId ? { facultyId: viewer.facultyId } : null;
  if (scope === "program") return viewer.studyProgramId ? { studyProgramId: viewer.studyProgramId } : null;
  if (scope === "year") {
    return viewer.year && viewer.universityId ? { year: viewer.year, universityId: viewer.universityId } : null;
  }
  return {};
}

export async function studentLeaderboard(viewer: Viewer, scope: StudentScope, period: Period = "all") {
  const filter = scopeFilter(scope, viewer);
  if (filter === null) return { rows: [] as StudentRow[], me: null as StudentRow | null, available: false };

  const since = periodStart(period);
  const members =
    scope === "global"
      ? null
      : (await db.user.findMany({ where: filter, select: { id: true } })).map((row) => row.id);

  const groups = await db.competitionPoint.groupBy({
    by: ["userId"],
    where: {
      revokedAt: null,
      ...(since ? { createdAt: { gte: since } } : {}),
      ...(members ? { userId: { in: members } } : {}),
    },
    _sum: { points: true },
  });
  const ranked = groups
    .map((group) => ({ userId: group.userId, points: group._sum.points ?? 0 }))
    .filter((row) => row.points > 0)
    .sort((a, b) => b.points - a.points);

  const top = ranked.slice(0, 20);
  const myIndex = ranked.findIndex((row) => row.userId === viewer.id);
  const wanted = [...new Set([...top.map((row) => row.userId), ...(myIndex >= 0 ? [viewer.id] : [])])];

  const [users, stats, badges] = await db.$transaction([
    db.user.findMany({
      where: { id: { in: wanted } },
      select: { id: true, name: true, username: true, avatar: true, isVerified: true, university: { select: { abbr: true } } },
    }),
    db.competitorStats.findMany({ where: { userId: { in: wanted } }, select: { userId: true, wins: true, battles: true } }),
    db.userBadge.groupBy({
      by: ["userId"],
      where: { userId: { in: wanted }, badge: { code: { startsWith: "comp_" } } },
      _count: { _all: true },
      orderBy: { userId: "asc" },
    }),
  ]);

  const build = (userId: string, points: number, rank: number): StudentRow | null => {
    const user = users.find((row) => row.id === userId);
    if (!user) return null;
    const stat = stats.find((row) => row.userId === userId);
    const badge = badges.find((row) => row.userId === userId);
    return {
      rank,
      userId,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      isVerified: user.isVerified,
      university: user.university?.abbr ?? null,
      points,
      wins: stat?.wins ?? 0,
      battles: stat?.battles ?? 0,
      achievements: (badge?._count as { _all?: number } | undefined)?._all ?? 0,
    };
  };

  return {
    rows: top.map((row, index) => build(row.userId, row.points, index + 1)).filter((row): row is StudentRow => row !== null),
    me: myIndex >= 0 ? build(viewer.id, ranked[myIndex].points, myIndex + 1) : null,
    available: true,
  };
}

/** Pikët e studentit, gjithsej dhe këtë javë. */
export async function studentPoints(userId: string) {
  const week = weekOf();
  const [all, thisWeek] = await db.$transaction([
    db.competitionPoint.aggregate({ where: { userId, revokedAt: null }, _sum: { points: true } }),
    db.competitionPoint.aggregate({
      where: { userId, revokedAt: null, createdAt: { gte: week.startsAt } },
      _sum: { points: true },
    }),
  ]);
  return { total: all._sum.points ?? 0, week: thisWeek._sum.points ?? 0 };
}
