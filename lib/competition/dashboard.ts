import "server-only";

import { db } from "@/lib/db";
import { ensureCompetitionBadges } from "./achievements";
import { ensureQuestionBank } from "./bank";
import { expireStale } from "./battles";
import { suggestCategories } from "./categories";
import { dailyBattle } from "./daily";
import { recentEvents } from "./feed";
import { studentLeaderboard, studentPoints } from "./leaderboards";
import { dayKey } from "./rules";
import { finalizeTeamEvents, teamEvents } from "./team-events";
import { finalizePreviousWeek, remindWeekEnding, weekStandings } from "./weekly";

/**
 * Hapja e garës bën edhe punën e mirëmbajtjes, pa proces në sfond: skadon
 * sfidat e vjetra, mbyll javën dhe ngjarjet që kanë mbaruar. Çdo hap është
 * idempotent, prandaj dy hapje njëherësh nuk dyfishojnë asgjë.
 */
export async function maintainCompetition() {
  await ensureQuestionBank();
  await ensureCompetitionBadges();
  await expireStale();
  await finalizePreviousWeek();
  await finalizeTeamEvents();
}

type Me = {
  id: string;
  universityId: string | null;
  facultyId: string | null;
  studyProgramId: string | null;
  year: number | null;
  faculty: { name: string } | null;
  studyProgram: { name: string } | null;
};

export async function loadDashboard(me: Me) {
  await maintainCompetition();
  await remindWeekEnding(me.id);

  const dailyId = await dailyBattle();
  const [dailyEntry, dailyPlayers, stats, points, badgeCount, board, weekly, feed, events, battles, incoming] =
    await Promise.all([
      db.battleEntry.findUnique({
        where: { battleId_userId: { battleId: dailyId, userId: me.id } },
        select: { finishedAt: true, correct: true },
      }),
      db.battleEntry.count({ where: { battleId: dailyId, finishedAt: { not: null } } }),
      db.competitorStats.findUnique({ where: { userId: me.id } }),
      studentPoints(me.id),
      db.userBadge.count({ where: { userId: me.id, badge: { code: { startsWith: "comp_" } } } }),
      studentLeaderboard(me, "global", "all"),
      weekStandings(),
      recentEvents(10),
      teamEvents({ active: true, take: 3 }),
      db.battle.findMany({
        where: {
          mode: { in: ["challenge", "random"] },
          status: { in: ["pending", "waiting", "active"] },
          OR: [{ challengerId: me.id }, { opponentId: me.id }],
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          mode: true,
          category: true,
          status: true,
          challengerId: true,
          challenger: { select: { name: true, username: true, avatar: true } },
          opponent: { select: { name: true, username: true, avatar: true } },
          entries: { where: { userId: me.id }, select: { finishedAt: true } },
        },
      }),
      db.battle.count({ where: { mode: "challenge", status: "pending", opponentId: me.id, expiresAt: { gt: new Date() } } }),
    ]);

  const myUniversityIndex = weekly.standings.findIndex((row) => row.universityId === me.universityId);
  const myWeek = await db.competitionPoint.aggregate({
    where: { userId: me.id, revokedAt: null, createdAt: { gte: weekly.week.startsAt } },
    _sum: { points: true },
  });

  return {
    daily: {
      battleId: dailyId,
      day: dayKey(),
      done: Boolean(dailyEntry?.finishedAt),
      correct: dailyEntry?.finishedAt ? dailyEntry.correct : null,
      players: dailyPlayers,
    },
    stats: {
      rank: board.me?.rank ?? null,
      points: points.total,
      weekPoints: points.week,
      universityRank: myUniversityIndex >= 0 ? myUniversityIndex + 1 : null,
      wins: stats?.wins ?? 0,
      battles: stats?.battles ?? 0,
      streak: stats?.streak ?? 0,
      achievements: badgeCount,
    },
    week: {
      key: weekly.week.key,
      endsAt: weekly.week.endsAt.toISOString(),
      standings: weekly.standings.slice(0, 5),
      myContribution: myWeek._sum.points ?? 0,
    },
    battles: battles.map((battle) => {
      const mine = battle.challengerId === me.id;
      const other = mine ? battle.opponent : battle.challenger;
      return {
        id: battle.id,
        mode: battle.mode,
        category: battle.category,
        status: battle.status,
        incoming: !mine && battle.status === "pending",
        played: Boolean(battle.entries[0]?.finishedAt),
        opponent: other,
      };
    }),
    incoming,
    feed,
    events,
    suggested: suggestCategories(`${me.studyProgram?.name ?? ""} ${me.faculty?.name ?? ""}`),
  };
}

export type Dashboard = Awaited<ReturnType<typeof loadDashboard>>;
