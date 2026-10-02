import { db } from "@/lib/db";
import { parseMedia } from "@/lib/media";
import { participantSince } from "@/lib/voice";
import type { AccessUser } from "@/lib/access";

export type LiveRoom = {
  id: string;
  title: string;
  access: string;
  hostName: string;
  hostUsername: string;
  hostIsVerified: boolean;
  listeners: number;
};

/**
 * Dhomat e gjalla brenda rrethit të studentit.
 *
 * Numri i dëgjuesve llogaritet nga rrahjet, jo nga rreshtat e hyrjes: pa këtë,
 * një skedë e mbyllur do ta mbante dhomën përgjithmonë me tetë veta brenda, dhe
 * numri do të ishte gënjeshtër.
 */
export async function getLiveRooms(
  user: AccessUser & { facultyId: string | null; universityId: string | null },
  limit = 4,
): Promise<LiveRoom[]> {
  const rooms = await db.voiceRoom.findMany({
    where: {
      status: "live",
      OR: [
        { scope: "faculty", facultyId: user.facultyId ?? undefined },
        { scope: "university", universityId: user.universityId ?? undefined },
        { scope: "followers", host: { followers: { some: { followerId: user.id } } } },
        { hostId: user.id },
      ],
    },
    orderBy: { startsAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      access: true,
      host: { select: { name: true, username: true, isVerified: true } },
      _count: {
        select: { participants: { where: { leftAt: null, seenAt: { gte: participantSince() } } } },
      },
    },
  });

  return rooms.map((room) => ({
    id: room.id,
    title: room.title,
    access: room.access,
    hostName: room.host.name,
    hostUsername: room.host.username,
    hostIsVerified: room.host.isVerified,
    listeners: room._count.participants,
  }));
}

/** Gjendja e plotë e një dhomë, për faqen e saj. */
export async function getRoom(roomId: string) {
  const room = await db.voiceRoom.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      title: true,
      description: true,
      access: true,
      scope: true,
      status: true,
      hostId: true,
      facultyId: true,
      universityId: true,
      maxParticipants: true,
      host: { select: { name: true, username: true, isVerified: true, role: true } },
    },
  });
  if (!room) return null;

  const [participants, messages] = await Promise.all([
    db.voiceParticipant.findMany({
      where: { roomId, leftAt: null, seenAt: { gte: participantSince() } },
      orderBy: { joinedAt: "asc" },
      select: {
        role: true,
        isMuted: true,
        handRaised: true,
        user: { select: { id: true, name: true, username: true, avatar: true, isVerified: true } },
      },
    }),
    db.voiceMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true,
        text: true,
        media: true,
        createdAt: true,
        user: { select: { name: true, username: true, avatar: true } },
      },
    }),
  ]);

  return {
    room,
    participants,
    messages: messages.map((message) => ({ ...message, media: parseMedia(message.media) })),
  };
}
