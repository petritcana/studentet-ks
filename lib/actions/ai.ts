"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  explainSimply,
  makeFlashcards,
  makeQuiz,
  summarize,
  type AiResult,
  type Flashcard,
  type QuizQuestion,
} from "@/lib/ai";

async function loadMaterial(materialId: string) {
  await requireUser();
  const material = await db.material.findUnique({
    where: { id: materialId },
    select: {
      id: true,
      title: true,
      type: true,
      pages: true,
      professor: true,
      description: true,
      isHidden: true,
      course: { select: { name: true } },
    },
  });
  if (!material || material.isHidden) return null;

  return {
    title: material.title,
    courseName: material.course.name,
    professor: material.professor,
    description: material.description,
    pages: material.pages,
    type: material.type,
    href: `/materialet/${material.id}`,
  };
}

export async function summarizeMaterial(
  materialId: string,
): Promise<AiResult<string[]> | null> {
  const input = await loadMaterial(materialId);
  return input ? summarize(input) : null;
}

export async function flashcardsForMaterial(
  materialId: string,
): Promise<AiResult<Flashcard[]> | null> {
  const input = await loadMaterial(materialId);
  return input ? makeFlashcards(input) : null;
}

export async function quizForMaterial(
  materialId: string,
): Promise<AiResult<QuizQuestion[]> | null> {
  const input = await loadMaterial(materialId);
  return input ? makeQuiz(input) : null;
}

export async function explainParagraph(
  materialId: string,
  paragraph: string,
): Promise<AiResult<string> | null> {
  const input = await loadMaterial(materialId);
  if (!input) return null;
  return explainSimply(paragraph, {
    courseName: input.courseName,
    href: input.href,
    title: input.title,
  });
}
