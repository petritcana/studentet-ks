import "server-only";

import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { recordEvent } from "./feed";
import { engagedPlayers, notifyMany } from "./notify-many";
import { dayKey, weekOf } from "./rules";

/**
 * Gara e universiteteve.
 *
 * Renditja llogaritet vetëm nga regjistri i pikëve, për çdo periudhë. Java mbyllet
 * një herë, kur dikush hap garën pas fundit të saj: rezultati ruhet, arritjet e
 * universiteteve jepen, dhe lojtarët e javës e mësojnë vendin e universitetit të
 * tyre. Pa punë në sfond: çdo hap është idempotent.
 */

export type UniversityStanding = {
  universityId: string;
  name: string;
  abbr: string;
  slug: string;
  logo: string | null;
  points: number;
  participants: number;
  wins: number;
  battles: number;
  contributions: number;
};

const CONTRIBUTION_SOURCES = ["material_approved", "answer_accepted", "post_useful"];

export async function universityStandings(since?: Date, until?: Date): Promise<UniversityStanding[]> {
  const window = {
    revokedAt: null,
    universityId: { not: null },
    ...(since || until ? { createdAt: { ...(since ? { gte: since } : {}), ...(until ? { lt: until } : {}) } } : {}),
  };

  const [totals, participants, bySource, universities] = await Promise.all([
    db.competitionPoint.groupBy({ by: ["universityId"], where: window, _sum: { points: true } }),
    db.competitionPoint.groupBy({ by: ["universityId", "userId"], where: window }),
    db.competitionPoint.groupBy({ by: ["universityId", "source"], where: window, _count: { _all: true } }),
    db.university.findMany({ where: { active: true }, select: { id: true, name: true, abbr: true, slug: true, logo: true } }),
  ]);

  const count = (universityId: string, sources: string[]) =>
    bySource
      .filter((row) => row.universityId === universityId && sources.includes(row.source))
      .reduce((sum, row) => sum + row._count._all, 0);

  return universities
    .map((university) => ({
      universityId: university.id,
      name: university.name,
      abbr: university.abbr,
      slug: university.slug,
      logo: university.logo,
      points: totals.find((row) => row.universityId === university.id)?._sum.points ?? 0,
      participants: participants.filter((row) => row.universityId === university.id).length,
      wins: count(university.id, ["battle_win"]),
      battles: count(university.id, ["battle_complete", "daily_quiz", "event_quiz"]),
      contributions: count(university.id, CONTRIBUTION_SOURCES),
    }))
    .filter((row) => row.points > 0)
    .sort((a, b) => b.points - a.points || b.participants - a.participants);
}

export async function weekStandings(date: Date = new Date()) {
  const week = weekOf(date);
  return { week, standings: await universityStandings(week.startsAt, week.endsAt) };
}

/**
 * Fotografia ditore e renditjes javore. Kur një universitet ngjitet dy vende ose
 * del i pari, bëhet ngjarje dhe lojtarët e tij njoftohen, një herë në ditë.
 */
export async function snapshotRanking() {
  const today = dayKey();
  const exists = await db.rankSnapshot.findUnique({ where: { dayKey: today }, select: { dayKey: true } });
  if (exists) return;

  const { standings } = await weekStandings();
  const ranking = standings.map((row) => row.universityId);
  const previous = await db.rankSnapshot.findFirst({ where: { dayKey: { lt: today } }, orderBy: { dayKey: "desc" } });

  try {
    await db.rankSnapshot.create({ data: { dayKey: today, ranking: JSON.stringify(ranking) } });
  } catch {
    return;
  }
  if (!previous) return;

  const before: string[] = JSON.parse(previous.ranking);
  for (const [index, universityId] of ranking.entries()) {
    const was = before.indexOf(universityId);
    const rank = index + 1;
    const moved = was === -1 ? 0 : was - index;
    if (moved >= 2 || (rank === 1 && was > 0)) {
      await recordEvent({ kind: "university_rank", universityId, payload: { rank, moved } });
      await notifyMany({
        userIds: await engagedPlayers([universityId]),
        type: "university_rank",
        targetType: "competition",
        payload: { rank, university: standings[index].abbr },
        groupKey: `rank:${universityId}:${today}`,
      });
    }
  }
}

/** Mbyll javën e kaluar, një herë. Kthen true kur e mbylli tani. */
export async function finalizePreviousWeek(now: Date = new Date()) {
  const previous = weekOf(new Date(now.getTime() - 7 * 86_400_000));
  if (now < previous.endsAt) return false;

  const done = await db.competitionWeek.findUnique({ where: { weekKey: previous.key }, select: { weekKey: true } });
  if (done) return false;

  const standings = await universityStandings(previous.startsAt, previous.endsAt);
  try {
    await db.competitionWeek.create({
      data: {
        weekKey: previous.key,
        startsAt: previous.startsAt,
        endsAt: previous.endsAt,
        results: JSON.stringify(standings.map((row, index) => ({ rank: index + 1, ...row }))),
      },
    });
  } catch {
    // Një kërkesë tjetër e mbylli ndërkohë.
    return false;
  }
  if (standings.length === 0) return true;

  const top = (key: keyof UniversityStanding) =>
    [...standings].sort((a, b) => Number(b[key]) - Number(a[key]))[0];
  const awards: [string, UniversityStanding][] = [
    ["weekly_champion", standings[0]],
    ["quiz_champions", top("wins")],
    ["top_contributor", top("contributions")],
    ["most_active", top("participants")],
  ];
  for (const [code, row] of awards) {
    if (!row || Number(code === "quiz_champions" ? row.wins : code === "top_contributor" ? row.contributions : row.points) <= 0) continue;
    await db.universityAchievement.upsert({
      where: { code_period: { code, period: previous.key } },
      create: { code, period: previous.key, universityId: row.universityId },
      update: {},
    });
  }

  await recordEvent({
    kind: "weekly_result",
    universityId: standings[0].universityId,
    payload: { week: previous.key, points: standings[0].points },
  });

  // Lojtarët e javës e mësojnë vendin e universitetit të tyre.
  const players = await db.competitionPoint.findMany({
    where: { createdAt: { gte: previous.startsAt, lt: previous.endsAt }, revokedAt: null, universityId: { not: null } },
    distinct: ["userId"],
    select: { userId: true, universityId: true },
  });
  for (const [index, row] of standings.entries()) {
    await notifyMany({
      userIds: players.filter((player) => player.universityId === row.universityId).map((player) => player.userId),
      type: "weekly_result",
      targetType: "competition",
      payload: { rank: index + 1, university: row.abbr, winner: standings[0].abbr, week: previous.key },
      groupKey: `week:${previous.key}`,
    });
  }
  return true;
}

/** «Java mbyllet pas pak»: një herë në javë, vetëm për studentin që ka garuar këtë javë. */
export async function remindWeekEnding(userId: string, now: Date = new Date()) {
  const week = weekOf(now);
  const left = week.endsAt.getTime() - now.getTime();
  if (left > 24 * 3_600_000 || left <= 0) return;

  const played = await db.competitionPoint.count({
    where: { userId, revokedAt: null, createdAt: { gte: week.startsAt } },
  });
  if (played === 0) return;

  const already = await db.notification.findFirst({
    where: { userId, groupKey: `week_end:${week.key}` },
    select: { id: true },
  });
  if (already) return;

  await notify({
    userId,
    category: "competition",
    type: "weekly_ending",
    targetType: "competition",
    payload: { hours: Math.max(1, Math.round(left / 3_600_000)) },
    groupKey: `week_end:${week.key}`,
  });
}
