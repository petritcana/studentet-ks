import "server-only";

import { db } from "@/lib/db";
import { pickQuestions } from "./bank";
import type { CompetitionCategory } from "./categories";
import { recordEvent } from "./feed";
import { engagedPlayers, notifyMany } from "./notify-many";
import { QUESTIONS_PER_BATTLE, SECONDS_PER_QUESTION } from "./rules";

/**
 * Ngjarjet mes dy universiteteve.
 *
 * Admini e hap («UP kundër UBT, Ekonomi, 24 orë»). Çdo student i verifikuar i dy
 * universiteteve e luan një herë, dhe pikët e tij i shkojnë universitetit. Rezultati
 * llogaritet nga regjistri i pikëve, dhe ngjarja mbyllet një herë pas afatit.
 */
export async function createTeamEvent(input: {
  createdById: string;
  title: string;
  category: CompetitionCategory;
  universityAId: string;
  universityBId: string;
  hours: number;
}) {
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + input.hours * 3_600_000);
  const questions = await pickQuestions(input.category, QUESTIONS_PER_BATTLE, `event:${input.title}:${startsAt.getTime()}`);

  const event = await db.teamEvent.create({
    data: {
      title: input.title,
      category: input.category,
      universityAId: input.universityAId,
      universityBId: input.universityBId,
      startsAt,
      endsAt,
      createdById: input.createdById,
      battles: {
        create: {
          mode: "event",
          category: input.category,
          status: "active",
          questionIds: JSON.stringify(questions),
          timeLimitSec: QUESTIONS_PER_BATTLE * SECONDS_PER_QUESTION,
          expiresAt: endsAt,
        },
      },
    },
    select: { id: true },
  });

  await notifyMany({
    userIds: await engagedPlayers([input.universityAId, input.universityBId]),
    type: "team_event_started",
    targetId: event.id,
    targetType: "team_event",
    payload: { title: input.title },
    groupKey: `team_event:${event.id}`,
  });
  return event.id;
}

/** Pikët e secilit universitet në ngjarje, nga regjistri. */
export async function teamEventScores(event: { id: string; universityAId: string; universityBId: string }) {
  const rows = await db.competitionPoint.groupBy({
    by: ["universityId"],
    where: { source: "event_quiz", sourceId: event.id, revokedAt: null },
    _sum: { points: true },
    _count: { _all: true },
  });
  const of = (id: string) => rows.find((row) => row.universityId === id);
  return {
    a: of(event.universityAId)?._sum.points ?? 0,
    b: of(event.universityBId)?._sum.points ?? 0,
    playersA: of(event.universityAId)?._count._all ?? 0,
    playersB: of(event.universityBId)?._count._all ?? 0,
  };
}

/** Mbyll ngjarjet e skaduara. Idempotente: e dyta nuk gjen asgjë për të mbyllur. */
export async function finalizeTeamEvents() {
  const due = await db.teamEvent.findMany({
    where: { endsAt: { lte: new Date() }, finalizedAt: null },
    select: { id: true, title: true, universityAId: true, universityBId: true },
    take: 10,
  });

  for (const event of due) {
    const scores = await teamEventScores(event);
    const winnerId = scores.a === scores.b ? null : scores.a > scores.b ? event.universityAId : event.universityBId;

    const closed = await db.teamEvent.updateMany({
      where: { id: event.id, finalizedAt: null },
      data: { finalizedAt: new Date(), scoreA: scores.a, scoreB: scores.b, winnerId },
    });
    if (closed.count === 0) continue;

    await db.battle.updateMany({ where: { eventId: event.id }, data: { status: "finished", finishedAt: new Date() } });
    if (winnerId) {
      await db.universityAchievement.upsert({
        where: { code_period: { code: "event_winner", period: event.id } },
        create: { code: "event_winner", period: event.id, universityId: winnerId },
        update: {},
      });
    }
    await recordEvent({
      kind: "team_event",
      universityId: winnerId,
      payload: { eventId: event.id, title: event.title, scoreA: scores.a, scoreB: scores.b },
    });

    const players = await db.competitionPoint.findMany({
      where: { source: "event_quiz", sourceId: event.id },
      select: { userId: true },
    });
    await notifyMany({
      userIds: players.map((row) => row.userId),
      type: "team_event_result",
      targetId: event.id,
      targetType: "team_event",
      payload: { title: event.title, scoreA: scores.a, scoreB: scores.b },
      groupKey: `team_event_result:${event.id}`,
    });
  }
}

export async function teamEvents(options: { active?: boolean; take?: number } = {}) {
  const now = new Date();
  const rows = await db.teamEvent.findMany({
    where: options.active ? { startsAt: { lte: now }, endsAt: { gt: now } } : {},
    orderBy: { startsAt: "desc" },
    take: options.take ?? 20,
    select: {
      id: true,
      title: true,
      category: true,
      startsAt: true,
      endsAt: true,
      scoreA: true,
      scoreB: true,
      winnerId: true,
      finalizedAt: true,
      universityAId: true,
      universityBId: true,
      universityA: { select: { name: true, abbr: true, slug: true } },
      universityB: { select: { name: true, abbr: true, slug: true } },
      battles: { select: { id: true }, take: 1 },
    },
  });

  return Promise.all(
    rows.map(async (row) => {
      const live = row.finalizedAt ? null : await teamEventScores(row);
      return {
        id: row.id,
        title: row.title,
        category: row.category,
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt.toISOString(),
        active: row.startsAt <= now && row.endsAt > now,
        finished: Boolean(row.finalizedAt),
        universityA: { id: row.universityAId, ...row.universityA },
        universityB: { id: row.universityBId, ...row.universityB },
        scoreA: live ? live.a : row.scoreA,
        scoreB: live ? live.b : row.scoreB,
        winnerId: row.winnerId,
        battleId: row.battles[0]?.id ?? null,
      };
    }),
  );
}
