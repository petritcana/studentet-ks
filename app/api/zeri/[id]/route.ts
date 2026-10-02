import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRoom } from "@/lib/queries/voice";
import { participantSince } from "@/lib/voice";

/**
 * Gjendja e dhomës, për rifreskimin periodik.
 *
 * Kthen vetëm te dikush që ka një vend të gjallë brenda. Pa këtë kontroll, kushdo
 * që e di id-në do ta lexonte listën e pjesëmarrësve dhe bisedën e një dhomë me
 * fjalëkalim pa e ditur kurrë fjalëkalimin.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response(null, { status: 401 });

  const { id } = await params;

  const seat = await db.voiceParticipant.findUnique({
    where: { roomId_userId: { roomId: id, userId } },
    select: { leftAt: true, seenAt: true, removedAt: true },
  });
  // Faqja duhet ta dijë pse doli: e largoi pritësi, apo dhoma u mbyll.
  if (seat?.removedAt) return Response.json({ removed: true }, { status: 410 });
  const data = await getRoom(id);
  if (!data) return new Response(null, { status: 404 });
  if (data.room.status === "ended") return Response.json({ ended: true }, { status: 410 });
  if (!seat || seat.leftAt || seat.seenAt < participantSince()) {
    return new Response(null, { status: 403 });
  }

  return Response.json({
    participants: data.participants,
    messages: data.messages.map((message) => ({
      id: message.id,
      text: message.text,
      media: message.media,
      user: message.user,
    })),
  });
}
