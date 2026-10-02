import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { RING_SECONDS, callSeatSince } from "@/lib/chat-rules";

/**
 * Thirrjet që po më bien tani, kudo që jam në platformë.
 *
 * Bie vetëm thirrja e hapur në një bisedë ku jam anëtar i pranuar, që nuk e kam
 * heshtur, që s'e nisa unë, ku s'kam hyrë dhe s'e kam refuzuar, dhe vetëm brenda
 * kohës së ziles. Kush e nisi duhet të jetë ende brenda.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return Response.json({ calls: [] }, { status: 401 });

  const now = new Date();
  const calls = await db.chatCall.findMany({
    where: {
      endedAt: null,
      startedById: { not: me.id },
      startedAt: { gte: new Date(now.getTime() - RING_SECONDS * 1000) },
      participants: {
        none: { userId: me.id },
        some: { leftAt: null, seenAt: { gte: callSeatSince() } },
      },
      conversation: {
        members: {
          some: { userId: me.id, isAccepted: true, OR: [{ mutedUntil: null }, { mutedUntil: { lt: now } }] },
        },
      },
    },
    orderBy: { startedAt: "desc" },
    take: 3,
    select: {
      id: true,
      video: true,
      conversationId: true,
      startedBy: { select: { name: true, avatar: true } },
      conversation: { select: { type: true, title: true } },
    },
  });

  return Response.json({
    calls: calls.map((call) => ({
      id: call.id,
      video: call.video,
      conversationId: call.conversationId,
      group: call.conversation.type === "group" ? call.conversation.title ?? "" : null,
      caller: { name: call.startedBy.name, avatar: call.startedBy.avatar },
    })),
  });
}
