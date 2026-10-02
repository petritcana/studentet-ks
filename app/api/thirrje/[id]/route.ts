import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { RING_SECONDS, callSeatSince } from "@/lib/chat-rules";

/**
 * Gjendja e një thirrjeje: kush është brenda dhe a ka mbaruar.
 *
 * GET e lexon. POST është rrahja e shfletuesit që është brenda: pa të, pas pak
 * sekondash personi quhet jashtë dhe lidhjet me të mbyllen. E sheh vetëm kush
 * është anëtar i bisedës.
 */
export const dynamic = "force-dynamic";

async function state(callId: string, userId: string, beat: boolean) {
  const call = await db.chatCall.findUnique({
    where: { id: callId },
    select: {
      id: true,
      video: true,
      endedAt: true,
      endReason: true,
      startedAt: true,
      startedById: true,
      conversationId: true,
      conversation: { select: { type: true, members: { where: { userId }, select: { role: true } } } },
    },
  });
  if (!call || call.conversation.members.length === 0) return null;

  if (beat && !call.endedAt) {
    await db.chatCallParticipant.updateMany({
      where: { callId, userId, leftAt: null },
      data: { seenAt: new Date() },
    });
  }

  const participants = await db.chatCallParticipant.findMany({
    where: { callId, leftAt: null, seenAt: { gte: callSeatSince() } },
    orderBy: { joinedAt: "asc" },
    select: { user: { select: { id: true, name: true, avatar: true } } },
  });

  // Te biseda me dy veta, kur askush s'përgjigjet brenda kohës së ziles, thirrja humbet.
  let endedAt = call.endedAt;
  let endReason = call.endReason;
  const direct = call.conversation.type !== "group";
  if (!endedAt && direct && participants.length <= 1 && call.startedAt.getTime() < Date.now() - RING_SECONDS * 1000) {
    endedAt = new Date();
    endReason = "missed";
    await db.chatCall.update({ where: { id: callId }, data: { endedAt, endReason } });
    await db.chatCallParticipant.updateMany({ where: { callId, leftAt: null }, data: { leftAt: endedAt } });
  }

  return {
    id: call.id,
    video: call.video,
    ended: Boolean(endedAt),
    endReason,
    ringing: direct && participants.length <= 1,
    group: call.conversation.type === "group",
    canEnd: call.conversation.type !== "group" || call.conversation.members[0]?.role === "admin",
    participants: participants.map((row) => row.user),
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return new Response(null, { status: 401 });
  const { id } = await params;
  const result = await state(id, me.id, false);
  return result ? Response.json(result) : new Response(null, { status: 404 });
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return new Response(null, { status: 401 });
  const { id } = await params;
  const result = await state(id, me.id, true);
  return result ? Response.json(result) : new Response(null, { status: 404 });
}
