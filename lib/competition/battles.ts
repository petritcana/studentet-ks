import "server-only";

import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { parseIds, pickQuestions, publicQuestions, type PublicQuestion } from "./bank";
import type { CompetitionCategory } from "./categories";
import { recordEvent } from "./feed";
import { awardPoints, startOfKosovoDay } from "./points";
import {
  battleWinner,
  eloUpdate,
  GRACE_SECONDS,
  PENDING_HOURS,
  QUESTIONS_PER_BATTLE,
  SAME_OPPONENT_WINS_PER_DAY,
  SECONDS_PER_QUESTION,
} from "./rules";

/**
 * Betejat e kuizit.
 *
 * Çdo gjë që prek rezultatin ndodh këtu, te serveri: pyetjet dërgohen pa
 * përgjigjen e saktë, afati kontrollohet me orën e serverit, pikët llogariten nga
 * përgjigjet e ruajtura. Klienti vetëm shfaq.
 *
 * Mënyrat:
 *   challenge  sfidë drejt një shoku: pret pranimin, pastaj luajnë të dy
 *   random     «Gjej kundërshtar»: bashkohet me një betejë në pritje, ose hap një
 *   daily      kuizi ditor, një për studentin (`daily.ts`)
 *   event      ngjarja mes dy universiteteve, një për studentin (`team-events.ts`)
 *
 * Secili lojtar luan kur të dojë: beteja mbyllet kur të dy mbarojnë, ose kur
 * skadon. Rezultati i kundërshtarit nuk shihet derisa ta mbarosh edhe ti.
 */

type Me = { id: string; isVerified: boolean; universityId: string | null };

const HOUR = 3_600_000;

export class BattleError extends Error {
  constructor(public readonly key: string) {
    super(key);
  }
}

function battleLimitMs(timeLimitSec: number) {
  return (timeLimitSec + GRACE_SECONDS) * 1000;
}

async function newQuestions(category: CompetitionCategory | "mixed", count: number, seed: string) {
  const ids = await pickQuestions(category, count, seed);
  if (ids.length < count) throw new BattleError("competition.errorNoQuestions");
  return ids;
}

/** Sfida drejt një studenti. Lejohet vetëm mes njerëzve që ndjekin njëri-tjetrin në një drejtim. */
export async function createChallenge(me: Me, opponentId: string, category: CompetitionCategory) {
  if (opponentId === me.id) throw new BattleError("competition.errorSelf");

  const link = await db.follow.findFirst({
    where: {
      status: "accepted",
      OR: [
        { followerId: me.id, followingId: opponentId },
        { followerId: opponentId, followingId: me.id },
      ],
    },
    select: { id: true },
  });
  if (!link) throw new BattleError("competition.errorNotConnected");

  // Një sfidë e hapur mjafton: pa bombardim me sfida drejt të njëjtit student.
  const open = await db.battle.findFirst({
    where: {
      mode: "challenge",
      status: "pending",
      challengerId: me.id,
      opponentId,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  if (open) return open.id;

  const battle = await db.battle.create({
    data: {
      mode: "challenge",
      category,
      status: "pending",
      questionIds: JSON.stringify(await newQuestions(category, QUESTIONS_PER_BATTLE, `${me.id}:${opponentId}:${Date.now()}`)),
      timeLimitSec: QUESTIONS_PER_BATTLE * SECONDS_PER_QUESTION,
      challengerId: me.id,
      opponentId,
      expiresAt: new Date(Date.now() + PENDING_HOURS * HOUR),
    },
    select: { id: true },
  });

  await notify({
    userId: opponentId,
    category: "competition",
    type: "battle_challenge",
    actorId: me.id,
    targetId: battle.id,
    targetType: "battle",
    payload: { category },
  });
  return battle.id;
}

export async function respondChallenge(me: Me, battleId: string, accept: boolean) {
  const battle = await db.battle.findFirst({
    where: { id: battleId, mode: "challenge", opponentId: me.id, status: "pending", expiresAt: { gt: new Date() } },
    select: { id: true, challengerId: true, category: true },
  });
  if (!battle) throw new BattleError("competition.errorNotFound");

  await db.battle.update({
    where: { id: battle.id },
    data: accept
      ? { status: "active", acceptedAt: new Date(), expiresAt: new Date(Date.now() + PENDING_HOURS * HOUR) }
      : { status: "declined", finishedAt: new Date() },
  });

  if (battle.challengerId) {
    await notify({
      userId: battle.challengerId,
      category: "competition",
      type: accept ? "battle_accepted" : "battle_declined",
      actorId: me.id,
      targetId: battle.id,
      targetType: "battle",
      payload: { category: battle.category },
    });
  }
  return battle.id;
}

/**
 * «Gjej kundërshtar»: bashkohet me betejën në pritje që i përshtatet më mirë,
 * ose hap një të re. Përputhja shikon kategorinë, vlerësimin dhe universitetin:
 * kundërshtari nga një universitet tjetër preferohet, sepse gara është mes tyre.
 */
export async function findOpponent(me: Me, category: CompetitionCategory) {
  await expireStale();

  const waiting = await db.battle.findMany({
    where: {
      mode: "random",
      status: "waiting",
      category,
      challengerId: { not: me.id },
      expiresAt: { gt: new Date() },
    },
    take: 30,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      challengerId: true,
      challenger: { select: { universityId: true } },
    },
  });

  if (waiting.length > 0) {
    const ids = waiting.map((battle) => battle.challengerId).filter((id): id is string => Boolean(id));
    const stats = await db.competitorStats.findMany({ where: { userId: { in: [...ids, me.id] } }, select: { userId: true, rating: true } });
    const rating = new Map(stats.map((row) => [row.userId, row.rating]));
    const mine = rating.get(me.id) ?? 1000;

    const best = waiting
      .map((battle) => ({
        battle,
        cost:
          Math.abs((rating.get(battle.challengerId ?? "") ?? 1000) - mine) +
          (battle.challenger?.universityId && battle.challenger.universityId === me.universityId ? 150 : 0),
      }))
      .sort((a, b) => a.cost - b.cost)[0].battle;

    // Vetëm një lojtar mund ta zërë vendin: përditësimi kushtëzohet te gjendja.
    const taken = await db.battle.updateMany({
      where: { id: best.id, status: "waiting", opponentId: null },
      data: { opponentId: me.id, status: "active", acceptedAt: new Date() },
    });
    if (taken.count === 1) {
      if (best.challengerId) {
        await notify({
          userId: best.challengerId,
          category: "competition",
          type: "battle_started",
          actorId: me.id,
          targetId: best.id,
          targetType: "battle",
          payload: { category },
        });
      }
      return best.id;
    }
  }

  // Asnjë në pritje: hapet një betejë e re dhe studenti luan menjëherë.
  const open = await db.battle.findFirst({
    where: { mode: "random", status: "waiting", category, challengerId: me.id, expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  if (open) return open.id;

  const battle = await db.battle.create({
    data: {
      mode: "random",
      category,
      status: "waiting",
      questionIds: JSON.stringify(await newQuestions(category, QUESTIONS_PER_BATTLE, `${me.id}:${category}:${Date.now()}`)),
      timeLimitSec: QUESTIONS_PER_BATTLE * SECONDS_PER_QUESTION,
      challengerId: me.id,
      expiresAt: new Date(Date.now() + PENDING_HOURS * HOUR),
    },
    select: { id: true },
  });
  return battle.id;
}

/** A mund të luajë ky student në këtë betejë. */
async function canPlay(me: Me, battle: { mode: string; status: string; challengerId: string | null; opponentId: string | null; eventId: string | null; expiresAt: Date }) {
  if (battle.expiresAt.getTime() <= Date.now()) return false;
  if (battle.mode === "daily") return true;
  if (battle.mode === "event") {
    if (!battle.eventId || !me.universityId || !me.isVerified) return false;
    const event = await db.teamEvent.findUnique({
      where: { id: battle.eventId },
      select: { universityAId: true, universityBId: true, startsAt: true, endsAt: true },
    });
    const now = Date.now();
    return Boolean(
      event &&
        event.startsAt.getTime() <= now &&
        event.endsAt.getTime() > now &&
        [event.universityAId, event.universityBId].includes(me.universityId),
    );
  }
  if (battle.challengerId === me.id) return ["pending", "waiting", "active"].includes(battle.status);
  if (battle.opponentId === me.id) return battle.status === "active";
  return false;
}

/** Nis lojën e studentit. Afati numërohet nga ky çast, me orën e serverit. */
export async function startEntry(me: Me, battleId: string) {
  const battle = await db.battle.findUnique({ where: { id: battleId } });
  if (!battle || !(await canPlay(me, battle))) throw new BattleError("competition.errorCannotPlay");

  const existing = await db.battleEntry.findUnique({
    where: { battleId_userId: { battleId, userId: me.id } },
    select: { id: true },
  });
  if (existing) return existing.id;

  const entry = await db.battleEntry.create({
    data: { battleId, userId: me.id, universityId: me.isVerified ? me.universityId : null },
    select: { id: true },
  });
  return entry.id;
}

/**
 * Përgjigjja e një pyetjeje. Kontrollohet te serveri: pyetja i përket betejës,
 * nuk është përgjigjur më parë, dhe afati nuk ka kaluar. Përgjigjja e saktë
 * kthehet vetëm tani, pas zgjedhjes.
 */
export async function submitAnswer(me: Me, battleId: string, questionId: string, choice: number) {
  const entry = await db.battleEntry.findUnique({
    where: { battleId_userId: { battleId, userId: me.id } },
    select: {
      id: true,
      startedAt: true,
      finishedAt: true,
      battle: { select: { questionIds: true, timeLimitSec: true } },
      answers: { select: { questionId: true } },
    },
  });
  if (!entry || entry.finishedAt) throw new BattleError("competition.errorCannotPlay");

  const order = parseIds(entry.battle.questionIds);
  if (!order.includes(questionId)) throw new BattleError("competition.errorCannotPlay");
  if (entry.answers.some((answer) => answer.questionId === questionId)) {
    throw new BattleError("competition.errorAnswered");
  }

  const late = Date.now() - entry.startedAt.getTime() > battleLimitMs(entry.battle.timeLimitSec);
  if (late) {
    await finishEntry(entry.id);
    throw new BattleError("competition.errorTimeUp");
  }

  const question = await db.quizQuestion.findUnique({
    where: { id: questionId },
    select: { correctIndex: true, explanation: true },
  });
  if (!question) throw new BattleError("competition.errorCannotPlay");

  const valid = Number.isInteger(choice) && choice >= 0 && choice <= 3;
  const correct = valid && choice === question.correctIndex;

  try {
    await db.battleAnswer.create({
      data: { entryId: entry.id, questionId, choice: valid ? choice : -1, correct },
    });
  } catch {
    // Dy klikime njëherësh: e dyta ndalet nga çelësi unik.
    throw new BattleError("competition.errorAnswered");
  }
  if (correct) await db.battleEntry.update({ where: { id: entry.id }, data: { correct: { increment: 1 } } });

  const done = entry.answers.length + 1 >= order.length;
  if (done) await finishEntry(entry.id);

  return { correct, correctIndex: question.correctIndex, explanation: question.explanation, done };
}

/**
 * Mbyllja e lojës së një studenti: koha, pikët e pjesëmarrjes, dhe beteja kur
 * kanë mbaruar të dy. Pikët e pjesëmarrjes vijnë vetëm kur janë përgjigjur të
 * gjitha pyetjet: hapja dhe braktisja nuk jep asgjë.
 */
export async function finishEntry(entryId: string) {
  const entry = await db.battleEntry.findUnique({
    where: { id: entryId },
    select: {
      id: true,
      userId: true,
      startedAt: true,
      finishedAt: true,
      correct: true,
      _count: { select: { answers: true } },
      battle: { select: { id: true, mode: true, questionIds: true, dailyKey: true, eventId: true, timeLimitSec: true } },
    },
  });
  if (!entry || entry.finishedAt) return;

  const limit = battleLimitMs(entry.battle.timeLimitSec);
  const timeMs = Math.min(Date.now() - entry.startedAt.getTime(), limit);
  const closed = await db.battleEntry.updateMany({
    where: { id: entry.id, finishedAt: null },
    data: { finishedAt: new Date(), timeMs },
  });
  if (closed.count === 0) return;

  const total = parseIds(entry.battle.questionIds).length;
  const complete = entry._count.answers >= total;

  if (entry.battle.mode === "daily") {
    await db.competitorStats.upsert({
      where: { userId: entry.userId },
      create: { userId: entry.userId, dailyDone: 1 },
      update: { dailyDone: { increment: 1 } },
    });
    if (entry.correct > 0) {
      await awardPoints({ userId: entry.userId, source: "daily_quiz", sourceId: entry.battle.dailyKey ?? entry.battle.id, units: entry.correct });
    }
    return;
  }

  if (entry.battle.mode === "event") {
    if (entry.correct > 0 && entry.battle.eventId) {
      await awardPoints({ userId: entry.userId, source: "event_quiz", sourceId: entry.battle.eventId, units: entry.correct });
    }
    return;
  }

  if (complete) await awardPoints({ userId: entry.userId, source: "battle_complete", sourceId: entry.battle.id });
  await settleBattle(entry.battle.id);
}

/**
 * Mbyllja e betejës, kur ka mbaruar edhe lojtari i dytë ose kur ka skaduar.
 * Përditësimi i gjendjes kushtëzohet, që dy kërkesa njëherësh të mos e mbyllin
 * dy herë dhe të mos japin pikë dy herë.
 */
export async function settleBattle(battleId: string, force = false) {
  const battle = await db.battle.findUnique({
    where: { id: battleId },
    select: {
      id: true,
      mode: true,
      status: true,
      category: true,
      challengerId: true,
      opponentId: true,
      entries: { select: { userId: true, correct: true, timeMs: true, finishedAt: true } },
    },
  });
  if (!battle || !["challenge", "random"].includes(battle.mode) || battle.status === "finished") return;

  const players = [battle.challengerId, battle.opponentId].filter((id): id is string => Boolean(id));
  const finished = battle.entries.filter((entry) => entry.finishedAt);
  const everyoneDone = players.length === 2 && finished.length === 2;
  if (!everyoneDone && !force) return;

  const results = players.map((userId) => {
    const entry = battle.entries.find((row) => row.userId === userId);
    return { userId, correct: entry?.correct ?? 0, timeMs: entry?.timeMs ?? 0, finished: Boolean(entry?.finishedAt) };
  });
  const winnerId = players.length === 2 ? battleWinner(results) : null;

  const closed = await db.battle.updateMany({
    where: { id: battle.id, status: { not: "finished" } },
    data: { status: "finished", finishedAt: new Date(), winnerId },
  });
  if (closed.count === 0) return;

  // Statistikat dhe vlerësimi vetëm kur kanë luajtur vërtet dy veta.
  if (players.length === 2 && results.every((result) => result.finished)) {
    const [a, b] = players;
    const stats = await db.competitorStats.findMany({ where: { userId: { in: players } }, select: { userId: true, rating: true } });
    const ratingOf = (id: string) => stats.find((row) => row.userId === id)?.rating ?? 1000;
    const score = winnerId === a ? 1 : winnerId === b ? 0 : 0.5;
    const next = eloUpdate(ratingOf(a), ratingOf(b), score);

    for (const [userId, rating] of [[a, next.a], [b, next.b]] as const) {
      await db.competitorStats.upsert({
        where: { userId },
        create: { userId, rating, battles: 1, wins: winnerId === userId ? 1 : 0 },
        update: { rating, battles: { increment: 1 }, ...(winnerId === userId ? { wins: { increment: 1 } } : {}) },
      });
    }
  }

  if (winnerId) {
    const loserId = players.find((id) => id !== winnerId) ?? null;
    // Fitoret kundër të njëjtit kundërshtar numërohen vetëm dy herë në ditë.
    const repeated = loserId
      ? await db.battle.count({
          where: {
            winnerId,
            finishedAt: { gte: startOfKosovoDay() },
            OR: [
              { challengerId: winnerId, opponentId: loserId },
              { challengerId: loserId, opponentId: winnerId },
            ],
          },
        })
      : 0;
    if (repeated <= SAME_OPPONENT_WINS_PER_DAY) {
      await awardPoints({ userId: winnerId, source: "battle_win", sourceId: battle.id });
    }
    const winner = await db.user.findUnique({ where: { id: winnerId }, select: { universityId: true, isVerified: true } });
    await recordEvent({
      kind: "battle_won",
      actorId: winnerId,
      universityId: winner?.isVerified ? winner.universityId : null,
      payload: { loserId, category: battle.category, battleId: battle.id },
    });
  }

  for (const userId of players) {
    const mine = results.find((result) => result.userId === userId);
    const theirs = results.find((result) => result.userId !== userId);
    await notify({
      userId,
      category: "competition",
      type: "battle_finished",
      actorId: theirs?.userId ?? null,
      targetId: battle.id,
      targetType: "battle",
      payload: {
        category: battle.category,
        mine: mine?.correct ?? 0,
        theirs: theirs?.correct ?? 0,
        outcome: winnerId === null ? "draw" : winnerId === userId ? "won" : "lost",
      },
    });
  }
}

/**
 * Skadimi, i bërë kur dikush hap garën: pa punë në sfond.
 *   - sfida e papranuar skadon;
 *   - beteja e rastit pa kundërshtar mbyllet si lojë kundër komunitetit;
 *   - beteja e pranuar ku dikush nuk luajti mbyllet, dhe ai humb.
 */
export async function expireStale() {
  const now = new Date();
  await db.battle.updateMany({
    where: { mode: "challenge", status: "pending", expiresAt: { lte: now } },
    data: { status: "expired", finishedAt: now },
  });

  const overdue = await db.battle.findMany({
    where: { mode: { in: ["challenge", "random"] }, status: { in: ["waiting", "active"] }, expiresAt: { lte: now } },
    select: { id: true, entries: { where: { finishedAt: null }, select: { id: true } } },
    take: 50,
  });
  for (const battle of overdue) {
    for (const entry of battle.entries) await finishEntry(entry.id);
    await settleBattle(battle.id, true);
  }

  // Lojërat e nisura dhe të braktisura, pas afatit të tyre, mbyllen.
  const stale = await db.battleEntry.findMany({
    where: { finishedAt: null, startedAt: { lte: new Date(now.getTime() - 15 * 60_000) } },
    select: { id: true },
    take: 50,
  });
  for (const entry of stale) await finishEntry(entry.id);
}

export type BattleView = {
  id: string;
  mode: string;
  category: string;
  status: string;
  timeLimitSec: number;
  expiresAt: string;
  role: "challenger" | "opponent" | "player" | "viewer";
  canRespond: boolean;
  canStart: boolean;
  total: number;
  me: { started: boolean; finished: boolean; answered: number; correct: number | null; secondsLeft: number | null } | null;
  current: PublicQuestion | null;
  review: { question: PublicQuestion; choice: number; correctIndex: number; correct: boolean }[];
  opponent: { id: string; name: string; username: string; avatar: string | null; answered: number; finished: boolean; correct: number | null } | null;
  challenger: { id: string; name: string; username: string; avatar: string | null } | null;
  winnerId: string | null;
  community: { average: number; players: number } | null;
};

/** Gjendja e betejës për shikuesin. Rezultati i tjetrit fshihet derisa të mbarosh. */
export async function battleView(me: Me, battleId: string): Promise<BattleView | null> {
  const battle = await db.battle.findUnique({
    where: { id: battleId },
    select: {
      id: true,
      mode: true,
      category: true,
      status: true,
      timeLimitSec: true,
      expiresAt: true,
      questionIds: true,
      challengerId: true,
      opponentId: true,
      winnerId: true,
      eventId: true,
      challenger: { select: { id: true, name: true, username: true, avatar: true } },
      opponent: { select: { id: true, name: true, username: true, avatar: true } },
      entries: {
        select: {
          id: true,
          userId: true,
          startedAt: true,
          finishedAt: true,
          correct: true,
          answers: { select: { questionId: true, choice: true, correct: true } },
        },
      },
    },
  });
  if (!battle) return null;

  const participant = battle.challengerId === me.id || battle.opponentId === me.id;
  if (!participant && !["daily", "event"].includes(battle.mode)) return null;

  const mine = battle.entries.find((entry) => entry.userId === me.id);
  const order = parseIds(battle.questionIds);

  // Afati kaloi ndërsa studenti mungonte: loja mbyllet tani, jo kur të përgjigjet.
  if (mine && !mine.finishedAt && Date.now() - mine.startedAt.getTime() > battleLimitMs(battle.timeLimitSec)) {
    await finishEntry(mine.id);
    return battleView(me, battleId);
  }

  const questions = mine ? await publicQuestions(order) : [];
  const answered = new Map((mine?.answers ?? []).map((answer) => [answer.questionId, answer]));
  const current = mine && !mine.finishedAt ? (questions.find((question) => !answered.has(question.id)) ?? null) : null;

  let review: BattleView["review"] = [];
  if (mine?.finishedAt) {
    const keys = await db.quizQuestion.findMany({ where: { id: { in: order } }, select: { id: true, correctIndex: true } });
    const key = new Map(keys.map((row) => [row.id, row.correctIndex]));
    review = questions.map((question) => {
      const answer = answered.get(question.id);
      return {
        question,
        choice: answer?.choice ?? -1,
        correctIndex: key.get(question.id) ?? -1,
        correct: answer?.correct ?? false,
      };
    });
  }

  const otherId = battle.challengerId === me.id ? battle.opponentId : battle.challengerId;
  const other = battle.entries.find((entry) => entry.userId === otherId);
  const otherProfile = battle.challengerId === me.id ? battle.opponent : battle.challenger;

  let community: BattleView["community"] = null;
  if (battle.mode === "random" && !battle.opponentId && battle.status === "finished") {
    const peers = await db.battleEntry.aggregate({
      where: { finishedAt: { not: null }, battle: { category: battle.category, mode: { in: ["random", "challenge"] } } },
      _avg: { correct: true },
      _count: { _all: true },
    });
    community = { average: Math.round((peers._avg.correct ?? 0) * 10) / 10, players: peers._count._all };
  }

  const role: BattleView["role"] =
    battle.challengerId === me.id ? "challenger" : battle.opponentId === me.id ? "opponent" : participant ? "player" : "viewer";

  return {
    id: battle.id,
    mode: battle.mode,
    category: battle.category,
    status: battle.status,
    timeLimitSec: battle.timeLimitSec,
    expiresAt: battle.expiresAt.toISOString(),
    role: ["daily", "event"].includes(battle.mode) ? "player" : role,
    canRespond: battle.mode === "challenge" && battle.status === "pending" && battle.opponentId === me.id,
    canStart: !mine && (await canPlay(me, battle)),
    total: order.length,
    me: mine
      ? {
          started: true,
          finished: Boolean(mine.finishedAt),
          answered: mine.answers.length,
          correct: mine.finishedAt ? mine.correct : null,
          secondsLeft: mine.finishedAt
            ? null
            : Math.max(0, Math.round((mine.startedAt.getTime() + battle.timeLimitSec * 1000 - Date.now()) / 1000)),
        }
      : null,
    current,
    review,
    opponent:
      otherId && otherProfile
        ? {
            ...otherProfile,
            answered: other?.answers.length ?? 0,
            finished: Boolean(other?.finishedAt),
            // Rezultati i tjetrit shihet vetëm pasi ta mbarosh edhe ti.
            correct: mine?.finishedAt && other?.finishedAt ? other.correct : null,
          }
        : null,
    challenger: battle.challenger,
    winnerId: battle.status === "finished" ? battle.winnerId : null,
    community,
  };
}
