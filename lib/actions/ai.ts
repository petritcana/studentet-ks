"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { aiLimits } from "@/lib/access";
import { discardQuestion, finishAsk, prepareAsk, type AskInput } from "@/lib/ai/ask";
import { getAssistant } from "@/lib/ai/models";
import type { AiAnswer, AiSource } from "@/lib/ai/provider";
import { fail, succeed, type ActionState } from "./types";

export type AskResult = ActionState & {
  conversationId?: string;
  answer?: string;
  sources?: AiSource[];
  lockedCount?: number;
  remaining?: number;
};

/**
 * Pyetja drejtuar asistentit, pa rrjedhe.
 *
 * Rruga `/api/asistenti` e rrjedh te njejten përgjigje shkronje për shkronje dhe
 * është ajo që përdor dock-u. Ky veprim mbetet për thirrjet nga serveri dhe si
 * rrugë rezerve kur rrjedha nuk ndizet.
 */
export async function askAssistant(input: AskInput): Promise<AskResult> {
  const prepared = await prepareAsk(input);
  if (!prepared.ok) {
    return { ...fail(prepared.messageKey), remaining: prepared.remaining };
  }

  let answer: AiAnswer | null = null;
  try {
    answer = await getAssistant().provider.answer(prepared.request);
  } catch {
    answer = null;
  }
  if (!answer) {
    await discardQuestion(prepared.userMessageId, prepared.conversationId);
    return fail("assistantDock.unavailable");
  }
  await finishAsk(prepared.conversationId, prepared.request.mode, answer);

  return {
    ...succeed(),
    conversationId: prepared.conversationId,
    answer: answer.content,
    sources: answer.sources,
    lockedCount: prepared.lockedCount,
    remaining: prepared.remaining,
  };
}

export async function deleteConversation(conversationId: string): Promise<ActionState> {
  const me = await requireUser();
  await db.aiConversation.deleteMany({ where: { id: conversationId, userId: me.id } });
  return succeed();
}

/**
 * Pastrimi i historikut sipas planit.
 *
 * Llogaritë falas e mbajnë historikun shtatë ditë. Kjo nuk është ndëshkim: është
 * kufiri që e mban koston e ruajtjes të parashikueshme, dhe thuhet hapur në UI.
 */
export async function pruneHistory(): Promise<ActionState> {
  const me = await requireUser();
  const limits = aiLimits(me.access);
  const cutoff = new Date(Date.now() - limits.historyDays * 86_400_000);

  await db.aiConversation.deleteMany({ where: { userId: me.id, updatedAt: { lt: cutoff } } });
  return succeed();
}
