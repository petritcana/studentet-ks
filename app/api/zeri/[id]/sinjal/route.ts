import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { participantSince } from "@/lib/voice";
import { iceServers } from "@/lib/ice-servers";

/**
 * Sinjalet WebRTC të një dhome.
 *
 * Zëri shkon drejt mes shfletuesve. Këtu kalojnë vetëm mesazhet e shkurtra që
 * u duhen atyre për t'u gjetur: oferta, përgjigjja dhe kandidatët ICE. Vetëm kush
 * ka vend të gjallë në dhomë dërgon ose merr, dhe vetëm te dikush tjetër brenda.
 * Sinjali fshihet sapo lexohet.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const KINDS = new Set(["offer", "answer", "candidate"]);
const MAX_PAYLOAD = 20_000;
const MAX_BATCH = 40;

async function activeSeat(roomId: string, userId: string) {
  const seat = await db.voiceParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { leftAt: true, seenAt: true, removedAt: true },
  });
  return Boolean(seat && !seat.leftAt && !seat.removedAt && seat.seenAt >= participantSince());
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return new Response(null, { status: 401 });
  const { id } = await params;
  if (!(await activeSeat(id, me.id))) return new Response(null, { status: 403 });

  const signals = await db.voiceSignal.findMany({
    where: { roomId: id, toId: me.id },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, fromId: true, kind: true, payload: true },
  });

  // Lexuar një herë, fshirë. Sinjalet e harruara (dikush doli pa lexuar) pastrohen pas dy minutash.
  await db.voiceSignal.deleteMany({
    where: {
      OR: [
        { id: { in: signals.map((signal) => signal.id) } },
        { roomId: id, createdAt: { lt: new Date(Date.now() - 120_000) } },
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
  if (!(await activeSeat(id, me.id))) return new Response(null, { status: 403 });

  const body = (await request.json().catch(() => null)) as { signals?: unknown } | null;
  const raw = Array.isArray(body?.signals) ? body.signals.slice(0, MAX_BATCH) : [];
  const signals = raw.flatMap((entry) => {
    const item = entry as { to?: unknown; kind?: unknown; payload?: unknown };
    if (typeof item.to !== "string" || typeof item.kind !== "string" || typeof item.payload !== "string") return [];
    if (!KINDS.has(item.kind) || item.payload.length > MAX_PAYLOAD || item.to === me.id) return [];
    return [{ to: item.to, kind: item.kind, payload: item.payload }];
  });
  if (signals.length === 0) return Response.json({ ok: true, sent: 0 });

  // Marrësi duhet të jetë brenda të njëjtës dhomë tani.
  const targets = await db.voiceParticipant.findMany({
    where: {
      roomId: id,
      userId: { in: [...new Set(signals.map((signal) => signal.to))] },
      leftAt: null,
      removedAt: null,
      seenAt: { gte: participantSince() },
    },
    select: { userId: true },
  });
  const allowed = new Set(targets.map((target) => target.userId));
  const rows = signals
    .filter((signal) => allowed.has(signal.to))
    .map((signal) => ({ roomId: id, fromId: me.id, toId: signal.to, kind: signal.kind, payload: signal.payload }));

  if (rows.length > 0) await db.voiceSignal.createMany({ data: rows });
  return Response.json({ ok: true, sent: rows.length });
}
