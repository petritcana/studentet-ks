import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { VoiceRoomView } from "@/components/voice/voice-room-view";
import { VoiceRoomGate } from "@/components/voice/voice-room-gate";
import { getRoom } from "@/lib/queries/voice";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { participantSince, type VoiceRole } from "@/lib/voice";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getRoom(id);
  return { title: data?.room.title ?? "" };
}

export const dynamic = "force-dynamic";

/**
 * Faqja e një dhomë.
 *
 * Hyrja kontrollohet këtu, në server. Nëse studenti nuk ka një vend të gjallë,
 * i shfaqet porta: për një dhomë të hapur një buton, për një me fjalëkalim fusha
 * e tij. Ndryshe do të mjaftonte të dinte adresën.
 */
export default async function VoiceRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, me] = await Promise.all([params, requireUser()]);

  const data = await getRoom(id);
  if (!data) notFound();

  if (data.room.status === "ended") redirect("/feed");

  const seat = await db.voiceParticipant.findUnique({
    where: { roomId_userId: { roomId: id, userId: me.id } },
    select: { role: true, leftAt: true, seenAt: true },
  });

  const inside = Boolean(seat && !seat.leftAt && seat.seenAt >= participantSince());

  if (!inside) {
    const [t, invite] = await Promise.all([
      getTranslations("voice"),
      db.voiceInvite.findUnique({ where: { roomId_userId: { roomId: id, userId: me.id } }, select: { grantsEntry: true } }),
    ]);
    return (
      <VoiceRoomGate
        roomId={id}
        title={data.room.title}
        description={data.room.description}
        hostName={data.room.host.name}
        // Ftesa e pritësit e hap derën: fjalëkalimi nuk kërkohet.
        needsPassword={data.room.access === "password" && !invite?.grantsEntry}
        listeners={data.participants.length}
        joinLabel={t("join")}
      />
    );
  }

  return (
    <VoiceRoomView
      roomId={id}
      title={data.room.title}
      description={data.room.description}
      isHost={data.room.hostId === me.id}
      meId={me.id}
      myRole={(seat?.role ?? "listener") as VoiceRole}
      participants={data.participants}
      messages={data.messages.map((message) => ({
        id: message.id,
        text: message.text,
        media: message.media,
        user: message.user,
      }))}
    />
  );
}
