"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  BattleError,
  createChallenge,
  findOpponent,
  respondChallenge,
  startEntry,
  submitAnswer,
} from "@/lib/competition/battles";
import { COMPETITION_CATEGORIES, isCategory } from "@/lib/competition/categories";
import { dailyBattle, dailyParticipation } from "@/lib/competition/daily";
import { createTeamEvent } from "@/lib/competition/team-events";
import { requireAdmin, requireUser, requireParticipant } from "@/lib/session";
import { fail, succeed, type ActionState } from "./types";

/**
 * Veprimet e garës.
 *
 * Asnjë nuk pranon pikë ose rezultat nga klienti: ai dërgon vetëm zgjedhjen
 * (sfidë, kategori, alternativë), dhe serveri llogarit gjithçka tjetër.
 */

type Result = ActionState & { battleId?: string };

async function player() {
  const me = await requireParticipant();
  return { id: me.id, isVerified: me.isVerified, universityId: me.universityId };
}

function explain(error: unknown): ActionState {
  if (error instanceof BattleError) return fail(error.key);
  console.warn("[gara]", error instanceof Error ? error.message : error);
  return fail("errors.generic");
}

export async function challengeStudent(username: string, category: string): Promise<Result> {
  if (!isCategory(category)) return fail("errors.generic");
  const me = await player();
  const opponent = await db.user.findUnique({ where: { username: username.replace(/^@/, "").toLowerCase() }, select: { id: true } });
  if (!opponent) return fail("competition.errorNoStudent");
  try {
    const battleId = await createChallenge(me, opponent.id, category);
    revalidatePath("/gara");
    return { ...succeed("competition.challengeSent"), battleId };
  } catch (error) {
    return explain(error);
  }
}

export async function respondToChallenge(battleId: string, accept: boolean): Promise<Result> {
  const me = await player();
  try {
    await respondChallenge(me, battleId, accept);
    revalidatePath("/gara");
    return { ...succeed(accept ? "competition.challengeAccepted" : "competition.challengeDeclined"), battleId };
  } catch (error) {
    return explain(error);
  }
}

export async function findOpponentFor(category: string): Promise<Result> {
  if (!isCategory(category)) return fail("errors.generic");
  const me = await player();
  try {
    return { ...succeed(), battleId: await findOpponent(me, category) };
  } catch (error) {
    return explain(error);
  }
}

export async function openDailyQuiz(): Promise<Result> {
  await requireParticipant();
  try {
    return { ...succeed(), battleId: await dailyBattle() };
  } catch (error) {
    return explain(error);
  }
}

export async function startBattle(battleId: string): Promise<ActionState> {
  const me = await player();
  try {
    await startEntry(me, battleId);
    return succeed();
  } catch (error) {
    return explain(error);
  }
}

export async function answerQuestion(
  battleId: string,
  questionId: string,
  choice: number,
): Promise<ActionState & { correct?: boolean; correctIndex?: number; done?: boolean }> {
  const me = await player();
  try {
    const result = await submitAnswer(me, battleId, questionId, Number(choice));
    if (result.done) {
      const battle = await db.battle.findUnique({ where: { id: battleId }, select: { mode: true } });
      if (battle?.mode === "daily") await dailyParticipation(battleId);
      revalidatePath("/gara");
    }
    return { ...succeed(), correct: result.correct, correctIndex: result.correctIndex, done: result.done };
  } catch (error) {
    return explain(error);
  }
}

export async function playTeamEvent(eventId: string): Promise<Result> {
  const me = await player();
  const battle = await db.battle.findFirst({ where: { eventId, mode: "event" }, select: { id: true } });
  if (!battle) return fail("competition.errorNotFound");
  try {
    await startEntry(me, battle.id);
    return { ...succeed(), battleId: battle.id };
  } catch (error) {
    return explain(error);
  }
}

const eventSchema = z.object({
  title: z.string().trim().min(3).max(90),
  category: z.enum(COMPETITION_CATEGORIES),
  universityAId: z.string().min(1),
  universityBId: z.string().min(1),
  hours: z.number().int().min(1).max(168),
});

export async function createTeamEventAction(input: z.input<typeof eventSchema>): Promise<ActionState & { id?: string }> {
  const admin = await requireAdmin();
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success || parsed.data.universityAId === parsed.data.universityBId) {
    return fail("competition.errorEventInvalid");
  }
  const id = await createTeamEvent({ ...parsed.data, createdById: admin.id });
  await recordAudit({ actorId: admin.id, action: "team_event", targetType: "team_event", targetId: id });
  revalidatePath("/gara");
  revalidatePath("/admin/gara");
  return { ...succeed("competition.eventCreated"), id };
}

/** Kë mund të sfidojë studenti: ata që ndjek ose që e ndjekin, me emër ose @username. */
export async function challengeCandidates(query: string) {
  const me = await requireUser();
  const term = query.trim().replace(/^@/, "").toLowerCase();
  const links = await db.follow.findMany({
    where: { status: "accepted", OR: [{ followerId: me.id }, { followingId: me.id }] },
    select: { followerId: true, followingId: true },
    take: 500,
  });
  const ids = [...new Set(links.map((link) => (link.followerId === me.id ? link.followingId : link.followerId)))];
  if (ids.length === 0) return [];

  const people = await db.user.findMany({
    where: {
      id: { in: ids },
      ...(term ? { OR: [{ username: { contains: term } }, { name: { contains: query.trim() } }] } : {}),
    },
    take: 8,
    orderBy: { name: "asc" },
    select: { id: true, name: true, username: true, avatar: true, university: { select: { abbr: true } } },
  });
  return people.map((person) => ({
    id: person.id,
    name: person.name,
    username: person.username,
    avatar: person.avatar,
    university: person.university?.abbr ?? null,
  }));
}
