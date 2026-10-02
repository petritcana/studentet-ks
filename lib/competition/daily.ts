import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { pickQuestions } from "./bank";
import { recordEvent } from "./feed";
import { engagedPlayers, notifyMany } from "./notify-many";
import { DAILY_QUESTIONS, DAILY_SECONDS, dayKey } from "./rules";
import { snapshotRanking } from "./weekly";

/**
 * Kuizi ditor: pesë pyetje, dy minuta, një herë në ditë.
 *
 * Një betejë e vetme për ditë, me datën e Kosovës si çelës unik, dhe një hyrje për
 * studentin (`BattleEntry` unike sipas betejës dhe studentit). Kuizi nuk mund të
 * përsëritet për pikë: hyrja e dytë nuk krijohet dot, dhe pikët e ditës janë
 * unike sipas datës.
 */
export async function dailyBattle() {
  const key = dayKey();
  const existing = await db.battle.findUnique({ where: { dailyKey: key }, select: { id: true } });
  if (existing) return existing.id;

  const questions = await pickQuestions("mixed", DAILY_QUESTIONS, `daily:${key}`);
  const tomorrow = new Date(Date.now() + 36 * 3_600_000);

  try {
    const battle = await db.battle.create({
      data: {
        mode: "daily",
        category: "general",
        status: "active",
        dailyKey: key,
        questionIds: JSON.stringify(questions),
        timeLimitSec: DAILY_SECONDS,
        expiresAt: tomorrow,
      },
      select: { id: true },
    });

    // Dita e re: njoftohen vetëm ata që kanë garuar së fundi, jo i gjithë rrjeti.
    await notifyMany({
      userIds: await engagedPlayers(),
      type: "daily_quiz",
      targetId: battle.id,
      targetType: "battle",
      payload: { day: key },
      groupKey: `daily:${key}`,
    });
    await snapshotRanking();
    return battle.id;
  } catch (error) {
    // Dy kërkesa të para të ditës njëherësh: e dyta merr atë që krijoi e para.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const again = await db.battle.findUnique({ where: { dailyKey: key }, select: { id: true } });
      if (again) return again.id;
    }
    throw error;
  }
}

/** Sa studentë e kanë bërë kuizin e sotëm. Pragjet e rrumbullakëta bëhen ngjarje. */
export async function dailyParticipation(battleId: string) {
  const count = await db.battleEntry.count({ where: { battleId, finishedAt: { not: null } } });
  const milestones = [10, 50, 100, 250, 500, 1000];
  if (milestones.includes(count)) {
    const already = await db.competitionEvent.findFirst({
      where: { kind: "daily_milestone", payload: { contains: `"battleId":"${battleId}","count":${count}` } },
      select: { id: true },
    });
    if (!already) await recordEvent({ kind: "daily_milestone", payload: { battleId, count } });
  }
  return count;
}
