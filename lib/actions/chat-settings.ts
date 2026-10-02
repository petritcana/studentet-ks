"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { MUTE_CHOICES, muteUntil, type MuteChoice } from "@/lib/chat-rules";
import { fail, succeed, type ActionState } from "./types";

/**
 * Cilësimet e një bisede: heshtja për secilin, rregullat dhe anëtarët e grupit.
 *
 * Heshtja është e personit, jo e bisedës: askush tjetër nuk e sheh. Rregullat e
 * grupit dhe anëtarët i ndryshon vetëm admini, dhe kontrolli bëhet këtu, jo te
 * butonat që fshihen.
 */

async function membership(conversationId: string, userId: string) {
  return db.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { role: true, conversation: { select: { type: true } } },
  });
}

/** Admini i grupit, ose asgjë. */
async function requireGroupAdmin(conversationId: string) {
  const me = await requireUser();
  const mine = await membership(conversationId, me.id);
  if (!mine || mine.conversation.type !== "group") return null;
  if (mine.role !== "admin") return null;
  return me;
}

export async function muteConversation(
  conversationId: string,
  choice: MuteChoice | null,
): Promise<ActionState & { mutedUntil?: string | null }> {
  const me = await requireUser();
  if (choice !== null && !MUTE_CHOICES.includes(choice)) return fail("errors.generic");

  const until = choice === null ? null : muteUntil(choice);
  const updated = await db.conversationMember.updateMany({
    where: { conversationId, userId: me.id },
    data: { mutedUntil: until },
  });
  if (updated.count === 0) return fail("errors.forbidden");

  revalidatePath(`/mesazhe/${conversationId}`);
  revalidatePath("/mesazhe");
  return { ...succeed(), mutedUntil: until ? until.toISOString() : null };
}

export async function updateGroupRules(
  conversationId: string,
  rules: { adminsOnly?: boolean; allowLinks?: boolean },
): Promise<ActionState> {
  const me = await requireGroupAdmin(conversationId);
  if (!me) return fail("errors.forbidden");

  const data: { adminsOnly?: boolean; allowLinks?: boolean } = {};
  if (typeof rules.adminsOnly === "boolean") data.adminsOnly = rules.adminsOnly;
  if (typeof rules.allowLinks === "boolean") data.allowLinks = rules.allowLinks;
  await db.conversation.update({ where: { id: conversationId }, data });

  revalidatePath(`/mesazhe/${conversationId}`);
  return succeed();
}

export async function setGroupRole(conversationId: string, userId: string, role: "admin" | "member"): Promise<ActionState> {
  const me = await requireGroupAdmin(conversationId);
  if (!me) return fail("errors.forbidden");
  if (role !== "admin" && role !== "member") return fail("errors.generic");

  const target = await membership(conversationId, userId);
  if (!target) return fail("errors.notFoundContent");

  // Grupi nuk mbetet kurrë pa admin.
  if (role === "member" && target.role === "admin") {
    const admins = await db.conversationMember.count({ where: { conversationId, role: "admin" } });
    if (admins <= 1) return fail("errors.lastAdmin");
  }

  await db.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { role },
  });

  revalidatePath(`/mesazhe/${conversationId}`);
  return succeed();
}

export async function removeGroupMember(conversationId: string, userId: string): Promise<ActionState> {
  const me = await requireGroupAdmin(conversationId);
  if (!me) return fail("errors.forbidden");
  if (userId === me.id) return fail("errors.generic");

  await db.conversationMember.deleteMany({ where: { conversationId, userId } });

  revalidatePath(`/mesazhe/${conversationId}`);
  revalidatePath("/mesazhe");
  return succeed();
}
