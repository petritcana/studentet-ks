import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { callSeatSince, callSignalRoom } from "@/lib/chat-rules";
import { iceServers } from "@/lib/ice-servers";

/**
 * Sinjalet WebRTC të një thirrjeje në bisedë.
 *
 * Zëri dhe pamja shkojnë drejt mes shfletuesve; këtu kalojnë vetëm oferta,
 * përgjigjja dhe kandidatët ICE. Vetëm kush është brenda thirrjes tani dërgon
 * ose merr, dhe vetëm te dikush tjetër brenda. Sinjali fshihet sapo lexohet.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const KINDS = new Set(["offer", "answer", "candidate"]);
const MAX_PAYLOAD = 20_000;
const MAX_BATCH = 40;

async function inCall(callId: string, userId: string) {
  const seat = await db.chatCallParticipant.findUnique({
    where: { callId_userId: { callId, userId } },
    select: { leftAt: true, seenAt: true, call: { select: { endedAt: true } } },
  });
  return Boolean(seat && !seat.leftAt && !seat.call.endedAt && seat.seenAt >= callSeatSince());
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return new Response(null, { status: 401 });
  const { id } = await params;
  if (!(await inCall(id, me.id))) return new Response(null, { status: 403 });

  const room = callSignalRoom(id);
  const signals = await db.voiceSignal.findMany({
    where: { roomId: room, toId: me.id },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, fromId: true, kind: true, payload: true },
  });

  await db.voiceSignal.deleteMany({
    where: {
      OR: [
        { id: { in: signals.map((signal) => signal.id) } },
        { roomId: room, createdAt: { lt: new Date(Date.now() - 120_000) } },
      ],
    },
  });

  return Response.json({
    iceServers: iceServers(),
    signals: signals.map((signal) => ({ from: signal.fromId, kind: signal.kind, payload: signal.payload })),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return new Response(null, { status: 401 });
  const { id } = await params;
  if (!(await inCall(id, me.id))) return new Response(null, { status: 403 });

  const body = (await request.json().catch(() => null)) as { signals?: unknown } | null;
  const raw = Array.isArray(body?.signals) ? body.signals.slice(0, MAX_BATCH) : [];
  const signals = raw.flatMap((entry) => {
    const item = entry as { to?: unknown; kind?: unknown; payload?: unknown };
    if (typeof item.to !== "string" || typeof item.kind !== "string" || typeof item.payload !== "string") return [];
    if (!KINDS.has(item.kind) || item.payload.length > MAX_PAYLOAD || item.to === me.id) return [];
    return [{ to: item.to, kind: item.kind, payload: item.payload }];
  });
  if (signals.length === 0) return Response.json({ ok: true, sent: 0 });

  const targets = await db.chatCallParticipant.findMany({
    where: {
      callId: id,
      userId: { in: [...new Set(signals.map((signal) => signal.to))] },
      leftAt: null,
      seenAt: { gte: callSeatSince() },
    },
    select: { userId: true },
  });
  const allowed = new Set(targets.map((target) => target.userId));
  const room = callSignalRoom(id);
  const rows = signals
    .filter((signal) => allowed.has(signal.to))
    .map((signal) => ({ roomId: room, fromId: me.id, toId: signal.to, kind: signal.kind, payload: signal.payload }));

  if (rows.length > 0) await db.voiceSignal.createMany({ data: rows });
  return Response.json({ ok: true, sent: rows.length });
}
