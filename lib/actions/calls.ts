"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, requireParticipant } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { callSeatSince } from "@/lib/chat-rules";
import { liveCall } from "@/lib/calls";
import { fail, succeed, type ActionState } from "./types";

/**
 * Thirrjet brenda bisedës.
 *
 * Te biseda me dy veta thërret kushdo. Te grupi thirrjen e nis vetëm admini;
 * të tjerët vendosin vetë nëse hyjnë. Një bisedë ka një thirrje të gjallë në një
 * kohë: kush shtyp «thirr» ndërsa një është hapur, thjesht hyn te ajo.
 */

type Seat = { conversationId: string; role: string; isAccepted: boolean; type: string };

async function seatIn(conversationId: string, userId: string): Promise<Seat | null> {
  const member = await db.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { role: true, isAccepted: true, conversation: { select: { type: true } } },
  });
  if (!member) return null;
  return { conversationId, role: member.role, isAccepted: member.isAccepted, type: member.conversation.type };
}

export async function startCall(
  conversationId: string,
  video: boolean,
): Promise<ActionState & { callId?: string }> {
  const me = await requireParticipant();
  const limit = rateLimit("message", me.id);
  if (!limit.ok) return fail("errors.rateLimited");

  const seat = await seatIn(conversationId, me.id);
  if (!seat || !seat.isAccepted) return fail("errors.forbidden");
  if (seat.type === "group" && seat.role !== "admin") return fail("errors.callAdminsOnly");

  const existing = await liveCall(conversationId);
  if (existing) {
    await takeSeat(existing.id, me.id);
    return { ...succeed(), callId: existing.id };
  }

  const call = await db.chatCall.create({
    data: { conversationId, startedById: me.id, video: Boolean(video), participants: { create: { userId: me.id } } },
    select: { id: true },
  });

  // Thirrja shënohet në bisedë, që kush e hap më vonë ta shohë dhe të hyjë.
  await db.message.create({ data: { conversationId, authorId: me.id, text: call.id, kind: "call" } });
  await db.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

  const others = await db.conversationMember.findMany({
    where: {
      conversationId,
      userId: { not: me.id },
      isAccepted: true,
      OR: [{ mutedUntil: null }, { mutedUntil: { lt: new Date() } }],
    },
    select: { userId: true },
  });
  if (others.length > 0) {
    await db.notification.createMany({
      data: others.map((other) => ({
        userId: other.userId,
        category: "social",
        type: video ? "call_video" : "call_audio",
        actorId: me.id,
        targetId: conversationId,
        targetType: "conversation",
        payload: JSON.stringify({ callId: call.id }),
      })),
    });
  }

  revalidatePath(`/mesazhe/${conversationId}`);
  return { ...succeed(), callId: call.id };
}

async function takeSeat(callId: string, userId: string) {
  await db.chatCallParticipant.upsert({
    where: { callId_userId: { callId, userId } },
    create: { callId, userId },
    update: { leftAt: null, seenAt: new Date() },
  });
}

export async function joinCall(callId: string): Promise<ActionState> {
  const me = await requireParticipant();
  const call = await db.chatCall.findUnique({ where: { id: callId }, select: { conversationId: true, endedAt: true } });
  if (!call || call.endedAt) return fail("errors.callEnded");

  const seat = await seatIn(call.conversationId, me.id);
  if (!seat || !seat.isAccepted) return fail("errors.forbidden");

  await takeSeat(callId, me.id);
  return succeed();
}

/** Dalja nga thirrja. Kur del i fundit, thirrja mbaron. */
export async function leaveCall(callId: string): Promise<ActionState> {
  const me = await requireUser();
  await db.chatCallParticipant.updateMany({ where: { callId, userId: me.id, leftAt: null }, data: { leftAt: new Date() } });

  const [remaining, call] = await Promise.all([
    db.chatCallParticipant.count({ where: { callId, leftAt: null, seenAt: { gte: callSeatSince() } } }),
    db.chatCall.findUnique({ where: { id: callId }, select: { conversation: { select: { type: true } } } }),
  ]);
  // Te biseda me dy veta, kur njëri e mbyll, thirrja mbaron për të dy.
  const direct = call?.conversation.type !== "group";
  if (remaining === 0 || (direct && remaining <= 1)) {
    const now = new Date();
    await db.chatCall.updateMany({ where: { id: callId, endedAt: null }, data: { endedAt: now, endReason: "ended" } });
    await db.chatCallParticipant.updateMany({ where: { callId, leftAt: null }, data: { leftAt: now } });
  }
  return succeed();
}

/**
 * Refuzimi i thirrjes që po bie. Zilja nuk bie më për mua; te biseda me dy veta
 * thirrja mbaron dhe thirrësi e sheh që u refuzua.
 */
export async function declineCall(callId: string): Promise<ActionState> {
  const me = await requireUser();
  const call = await db.chatCall.findUnique({
    where: { id: callId },
    select: { conversationId: true, endedAt: true, conversation: { select: { type: true } } },
  });
  if (!call) return fail("errors.notFoundContent");
  const seat = await seatIn(call.conversationId, me.id);
  if (!seat) return fail("errors.forbidden");

  const now = new Date();
  await db.chatCallParticipant.upsert({
    where: { callId_userId: { callId, userId: me.id } },
    create: { callId, userId: me.id, leftAt: now, declinedAt: now },
    update: { leftAt: now, declinedAt: now },
  });
  if (!call.endedAt && call.conversation.type !== "group") {
    await db.chatCall.update({ where: { id: callId }, data: { endedAt: now, endReason: "declined" } });
    await db.chatCallParticipant.updateMany({ where: { callId, leftAt: null }, data: { leftAt: now } });
  }
  return succeed();
}

/**
 * Mbyllja për të gjithë. Te grupi vetëm admini, te biseda me dy veta kushdo që
 * është brenda: kur njëri e mbyll, thirrja mbaron.
 */
export async function endCall(callId: string): Promise<ActionState> {
  const me = await requireUser();
  const call = await db.chatCall.findUnique({ where: { id: callId }, select: { conversationId: true, endedAt: true } });
  if (!call) return fail("errors.notFoundContent");
  if (call.endedAt) return succeed();

  const seat = await seatIn(call.conversationId, me.id);
  if (!seat) return fail("errors.forbidden");
  if (seat.type === "group" && seat.role !== "admin") return fail("errors.callAdminsOnly");

  const now = new Date();
  await db.chatCall.update({ where: { id: callId }, data: { endedAt: now, endReason: "ended" } });
  await db.chatCallParticipant.updateMany({ where: { callId, leftAt: null }, data: { leftAt: now } });
  revalidatePath(`/mesazhe/${call.conversationId}`);
  return succeed();
}
