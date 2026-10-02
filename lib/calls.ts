import { db } from "@/lib/db";
import { callSeatSince } from "@/lib/chat-rules";

/**
 * Thirrja e gjallë e bisedës, nëse ka. Ajo ku askush nuk rreh më mbyllet këtu,
 * pa proces në sfond: kush pyet i pari, e pastron.
 */
export async function liveCall(conversationId: string) {
  const open = await db.chatCall.findMany({
    where: { conversationId, endedAt: null },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      video: true,
      startedAt: true,
      startedById: true,
      participants: { where: { leftAt: null, seenAt: { gte: callSeatSince() } }, select: { userId: true } },
    },
  });

  let live: (typeof open)[number] | null = null;
  const stale: string[] = [];
  for (const call of open) {
    // Një thirrje e sapohapur ka ende kohë që të hyjë i pari.
    const fresh = call.startedAt >= callSeatSince();
    if (!live && (call.participants.length > 0 || fresh)) live = call;
    else stale.push(call.id);
  }
  if (stale.length > 0) {
    await db.chatCall.updateMany({ where: { id: { in: stale } }, data: { endedAt: new Date() } });
    await db.chatCallParticipant.updateMany({ where: { callId: { in: stale }, leftAt: null }, data: { leftAt: new Date() } });
  }
  return live;
}
