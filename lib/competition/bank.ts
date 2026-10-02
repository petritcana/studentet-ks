import "server-only";

import { db } from "@/lib/db";
import { COMPETITION_CATEGORIES, type CompetitionCategory } from "./categories";
import { QUESTION_BANK } from "./questions";
import { seededPick } from "./rules";

/** Pyetja siç i shkon shfletuesit: pa përgjigjen e saktë. */
export type PublicQuestion = { id: string; prompt: string; options: string[]; category: string };

let seeded = false;

/**
 * Banka mbillet herën e parë që gara hapet, pa hap të veçantë seed-i. Mbillet
 * vetëm kur tabela është bosh, që pyetjet e shtuara nga admini të mos preken.
 */
export async function ensureQuestionBank() {
  if (seeded) return;
  const count = await db.quizQuestion.count();
  if (count === 0) {
    await db.quizQuestion.createMany({
      data: COMPETITION_CATEGORIES.flatMap((category) =>
        QUESTION_BANK[category].map(([prompt, options, correctIndex, difficulty]) => ({
          category,
          prompt,
          options: JSON.stringify(options),
          correctIndex,
          difficulty,
        })),
      ),
    });
  }
  seeded = true;
}

/**
 * Pyetjet e një beteje. Rastësia vjen nga një farë, që testet të jenë të
 * përsëritshme dhe që dy lojtarët e së njëjtës betejë të marrin të njëjtat pyetje.
 */
export async function pickQuestions(category: CompetitionCategory | "mixed", count: number, seed: string) {
  await ensureQuestionBank();
  const rows = await db.quizQuestion.findMany({
    where: { active: true, ...(category === "mixed" ? {} : { category }) },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return seededPick(
    rows.map((row) => row.id),
    count,
    seed,
  );
}

export function parseIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** Pyetjet në rendin e betejës, pa indeksin e saktë. */
export async function publicQuestions(ids: string[]): Promise<PublicQuestion[]> {
  const rows = await db.quizQuestion.findMany({
    where: { id: { in: ids } },
    select: { id: true, prompt: true, options: true, category: true },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids
    .map((id) => byId.get(id))
    .filter((row) => row !== undefined)
    .map((row) => ({
      id: row.id,
      prompt: row.prompt,
      options: JSON.parse(row.options) as string[],
      category: row.category,
    }));
}
