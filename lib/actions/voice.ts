"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, requireParticipant } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import {
  canCreateRoom,
  canJoinRoom,
  canModerate,
  clampCapacity,
  participantSince,
  type VoiceRole,
} from "@/lib/voice";
import { fail, succeed, type ActionState } from "./types";
import { resolveAttachments } from "@/lib/attachments";
import { acceptedFollow } from "@/lib/follow";
import { notify } from "@/lib/notify";
import type { MediaRef } from "@/lib/media";
import { screen } from "@/lib/moderation";

const createSchema = z.object({
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().max(200).optional(),
  access: z.enum(["open", "password"]),
  password: z.string().min(4).max(64).optional(),
  scope: z.enum(["faculty", "university", "followers", "global"]),
  maxParticipants: z.number().int().optional(),
  shareToFeed: z.boolean().optional(),
});

export type CreateRoomResult = ActionState & { roomId?: string };

/**
 * Hapja e një dhomë.
 *
 * Fjalëkalimi hash-ohet menjëherë dhe nuk ruhet kurrë i pastër. Kjo nuk është
 * formalitet: një dhomë studimi mund ta ndajë fjalëkalimin me atë të llogarisë,
 * dhe një rrjedhje e bazës nuk duhet ta japë atë.
 */
export async function createVoiceRoom(input: {
  title: string;
  description?: string;
  access: "open" | "password";
  password?: string;
  scope: "faculty" | "university" | "followers" | "global";
  maxParticipants?: number;
  shareToFeed?: boolean;
}): Promise<CreateRoomResult> {
  const me = await requireParticipant();

  const limiter = rateLimit("voiceRoom", me.id);
  if (!limiter.ok) return fail("errors.rateLimited");

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fail("errors.generic");

  if (parsed.data.access === "password" && !parsed.data.password) {
    return fail("voice.passwordRequired");
  }
  if (parsed.data.scope === "global" && !me.pro) return fail("voice.globalNeedsPro");

  const hosted = await db.voiceRoom.count({ where: { hostId: me.id, status: "live" } });
  const verdict = canCreateRoom(hosted);
  if (!verdict.allowed) return fail(verdict.reason);

  const room = await db.voiceRoom.create({
    data: {
      hostId: me.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      access: parsed.data.access,
      passwordHash: parsed.data.password ? await bcrypt.hash(parsed.data.password, 10) : null,
      scope: parsed.data.scope,
      facultyId: me.facultyId,
      universityId: me.universityId,
      status: "live",
      maxParticipants: clampCapacity(parsed.data.maxParticipants),
      participants: {
        create: { userId: me.id, role: "host", isMuted: false },
      },
    },
    select: { id: true },
  });

  if (parsed.data.shareToFeed) {
    await db.post.create({
      data: {
        authorId: me.id,
        type: "text",
        text: parsed.data.title,
        scope: parsed.data.scope === "followers" ? "faculty" : parsed.data.scope,
        facultyId: me.facultyId,
        universityId: me.universityId,
        media: "[]",
        voiceRoomId: room.id,
      },
    });
  }

  revalidatePath("/feed");
  return { ...succeed(), roomId: room.id };
}

export type JoinResult = ActionState & { role?: VoiceRole };

/**
 * Hyrja në një dhomë.
 *
 * Fjalëkalimi verifikohet këtu dhe nuk kthehet kurrë te klienti. Rrethi i qasjes
 * kontrollohet përpara tij, që një lidhje e shpërndarë të mos e kalojë fakultetin.
 */
export async function joinVoiceRoom(roomId: string, password?: string): Promise<JoinResult> {
  const me = await requireUser();

  const room = await db.voiceRoom.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      hostId: true,
      scope: true,
      status: true,
      access: true,
      passwordHash: true,
      facultyId: true,
      universityId: true,
      maxParticipants: true,
    },
  });
  if (!room) return fail("errors.notFound");

  // Kush u largua nga pritësi nuk kthehet dot në të njëjtën dhomë.
  const previous = await db.voiceParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: me.id } },
    select: { removedAt: true },
  });
  if (previous?.removedAt) return fail("voice.removedFromRoom");

  const [liveCount, follows] = await Promise.all([
    db.voiceParticipant.count({
      where: { roomId, leftAt: null, seenAt: { gte: participantSince() } },
    }),
    db.follow.count({ where: { followerId: me.id, followingId: room.hostId } }),
  ]);

  const passwordMatches =
    room.access !== "password"
      ? true
      : Boolean(password && room.passwordHash && (await bcrypt.compare(password, room.passwordHash)));

  // Ftesa nga pritësi ose moderatori e hap derën edhe pa fjalëkalim dhe jashte rrethit.
  const invite = await db.voiceInvite.findUnique({
    where: { roomId_userId: { roomId, userId: me.id } },
    select: { grantsEntry: true },
  });

  const verdict = canJoinRoom(
    {
      id: me.id,
      facultyId: me.facultyId,
      universityId: me.universityId,
      isPro: me.pro,
      followsHost: follows > 0,
    },
    { ...room, liveCount },
    passwordMatches,
    Boolean(invite?.grantsEntry),
  );
  if (!verdict.allowed) return fail(verdict.reason);

  const role: VoiceRole = me.id === room.hostId ? "host" : "listener";

  await db.voiceParticipant.upsert({
    where: { roomId_userId: { roomId, userId: me.id } },
    update: { leftAt: null, seenAt: new Date() },
    create: { roomId, userId: me.id, role, isMuted: role !== "host" },
  });

  return { ...succeed(), role };
}

/** Dalja. Vendi lirohet menjëherë, që numëruesi të jetë i vërtetë. */
export async function leaveVoiceRoom(roomId: string): Promise<ActionState> {
  const me = await requireUser();

  await db.voiceParticipant.updateMany({
    where: { roomId, userId: me.id, leftAt: null },
    data: { leftAt: new Date(), handRaised: false },
  });

  return succeed();
}

/** Rrahja brenda dhomës. Pa të, një skedë e mbyllur do të mbetej brenda përgjithmonë. */
export async function heartbeatVoiceRoom(roomId: string): Promise<ActionState> {
  const me = await requireUser();

  await db.voiceParticipant.updateMany({
    where: { roomId, userId: me.id, leftAt: null },
    data: { seenAt: new Date() },
  });

  return succeed();
}

/** Ngritja e dorës. Pritësi e sheh dhe vendos. */
export async function raiseHand(roomId: string, raised: boolean): Promise<ActionState> {
  const me = await requireParticipant();

  await db.voiceParticipant.updateMany({
    where: { roomId, userId: me.id, leftAt: null },
    data: { handRaised: raised },
  });

  return succeed();
}

/** Heshtja e vetes. Gjithmonë e lejuar: askush nuk detyrohet të flasë. */
export async function setMuted(roomId: string, muted: boolean): Promise<ActionState> {
  const me = await requireUser();

  await db.voiceParticipant.updateMany({
    where: { roomId, userId: me.id, leftAt: null },
    data: { isMuted: muted },
  });

  return succeed();
}

/**
 * Veprimet e moderimit.
 *
 * Roli i vepruesit dhe i shënjestrës lexohen nga baza, kurrë nga klienti: një
 * kërkesë e ndërtuar me dorë nuk duhet ta bëjë dot dikë pritës.
 */
export async function moderateParticipant(input: {
  roomId: string;
  targetUserId: string;
  action: "mute" | "remove" | "promote" | "demote";
}): Promise<ActionState> {
  const me = await requireUser();

  const [actor, target] = await Promise.all([
    db.voiceParticipant.findUnique({
      where: { roomId_userId: { roomId: input.roomId, userId: me.id } },
      select: { role: true, leftAt: true },
    }),
    db.voiceParticipant.findUnique({
      where: { roomId_userId: { roomId: input.roomId, userId: input.targetUserId } },
      select: { role: true },
    }),
  ]);

  if (!actor || actor.leftAt || !target) return fail("voice.notAllowed");

  const verdict = canModerate(
    actor.role as VoiceRole,
    input.action,
    target.role as VoiceRole,
  );
  if (!verdict.allowed) return fail(verdict.reason);

  if (input.action === "remove") {
    const now = new Date();
    await db.$transaction([
      db.voiceParticipant.updateMany({
        where: { roomId: input.roomId, userId: input.targetUserId },
        data: { leftAt: now, removedAt: now, handRaised: false, isMuted: true },
      }),
      // Lidhjet e zërit me të mbyllen: sinjalet e mbetura nuk i dërgohen më.
      db.voiceSignal.deleteMany({
        where: { roomId: input.roomId, OR: [{ fromId: input.targetUserId }, { toId: input.targetUserId }] },
      }),
    ]);
    return succeed("voice.removed");
  }

  const data =
    input.action === "mute"
      ? { isMuted: true }
      : input.action === "promote"
        ? { role: "speaker", isMuted: false, handRaised: false }
        : { role: "listener", isMuted: true };

  await db.voiceParticipant.updateMany({
    where: { roomId: input.roomId, userId: input.targetUserId },
    data,
  });

  return succeed();
}

/** Mbyllja e dhomës. Vetëm pritësi. */
export async function endVoiceRoom(roomId: string): Promise<ActionState> {
  const me = await requireUser();

  const room = await db.voiceRoom.findUnique({
    where: { id: roomId },
    select: { hostId: true },
  });
  if (!room || room.hostId !== me.id) return fail("voice.onlyHostEnds");

  await db.$transaction([
    db.voiceRoom.update({
      where: { id: roomId },
      data: { status: "ended", endedAt: new Date() },
    }),
    db.voiceParticipant.updateMany({
      where: { roomId, leftAt: null },
      data: { leftAt: new Date() },
    }),
  ]);

  revalidatePath("/feed");
  return succeed();
}

/** Një rresht në bisedën me shkrim të dhomës, me foto, video ose skedarë nëse ka. */
export async function sendVoiceMessage(roomId: string, text: string, media: MediaRef[] = []): Promise<ActionState> {
  const me = await requireParticipant();

  const clean = text.trim().slice(0, 500);
  const attachments = await resolveAttachments(me.id, media, 4);
  if (!clean && attachments.length === 0) return fail("errors.generic");

  const seat = await db.voiceParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: me.id } },
    select: { leftAt: true, removedAt: true },
  });
  if (!seat || seat.leftAt || seat.removedAt) return fail("voice.notAllowed");

  if (clean) {
    const verdict = await screen(clean);
    if (!verdict.allowed) return fail(`guard.${verdict.category}`);
  }

  await db.voiceMessage.create({
    data: { roomId, userId: me.id, text: clean, media: JSON.stringify(attachments) },
  });
  return succeed();
}

export type VoiceInvitee = { id: string; name: string; username: string; avatar: string | null; invited: boolean };

/** Vendi im i gjallë në dhomë, me rolin. Null kur nuk jam brenda. */
async function liveSeat(roomId: string, userId: string) {
  const seat = await db.voiceParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { role: true, leftAt: true, removedAt: true, seenAt: true },
  });
  if (!seat || seat.leftAt || seat.removedAt || seat.seenAt < participantSince()) return null;
  return seat;
}

/**
 * Kë mund të ftoj: njerëzit që ndjek ose që më ndjekin, jo ata që janë tashmë
 * brenda, dhe jo kush është larguar nga pritësi. Kërkimi me emër ose @emër.
 */
export async function listVoiceInvitees(roomId: string, query: string): Promise<VoiceInvitee[]> {
  const me = await requireUser();
  if (!(await liveSeat(roomId, me.id))) return [];

  const term = query.trim().replace(/^@/, "").slice(0, 40);
  const [inside, invites] = await Promise.all([
    db.voiceParticipant.findMany({
      where: { roomId, OR: [{ removedAt: { not: null } }, { leftAt: null, seenAt: { gte: participantSince() } }] },
      select: { userId: true },
    }),
    db.voiceInvite.findMany({ where: { roomId }, select: { userId: true } }),
  ]);
  const exclude = [me.id, ...inside.map((row) => row.userId)];
  const invited = new Set(invites.map((row) => row.userId));

  const people = await db.user.findMany({
    where: {
      id: { notIn: exclude },
      OR: [
        { followers: { some: { followerId: me.id, ...acceptedFollow } } },
        { following: { some: { followingId: me.id, ...acceptedFollow } } },
      ],
      ...(term ? { AND: [{ OR: [{ name: { contains: term } }, { username: { contains: term.toLowerCase() } }] }] } : {}),
    },
    orderBy: { name: "asc" },
    take: 20,
    select: { id: true, name: true, username: true, avatar: true },
  });

  return people.map((person) => ({ ...person, invited: invited.has(person.id) }));
}

/**
 * Fton dikë në dhomë. Çdo pjesëmarrës fton; ftesa e pritësit ose e moderatorit
 * e hap derën edhe pa fjalëkalim, ajo e të tjerëve është vetëm njoftim.
 */
export async function inviteToVoiceRoom(roomId: string, userId: string): Promise<ActionState> {
  const me = await requireParticipant();
  const seat = await liveSeat(roomId, me.id);
  if (!seat) return fail("voice.notAllowed");
  if (userId === me.id) return fail("errors.generic");

  const limit = rateLimit("voiceInvite", me.id);
  if (!limit.ok) return fail("errors.rateLimited");

  const [room, target, removed] = await Promise.all([
    db.voiceRoom.findUnique({ where: { id: roomId }, select: { title: true, status: true } }),
    db.user.findUnique({ where: { id: userId }, select: { id: true } }),
    db.voiceParticipant.findFirst({ where: { roomId, userId, removedAt: { not: null } }, select: { id: true } }),
  ]);
  if (!room || room.status === "ended" || !target) return fail("errors.notFoundContent");
  if (removed) return fail("voice.cannotInviteRemoved");

  const grantsEntry = seat.role === "host" || seat.role === "moderator";
  await db.voiceInvite.upsert({
    where: { roomId_userId: { roomId, userId } },
    create: { roomId, userId, invitedById: me.id, grantsEntry },
    // Një ftesë nga pritësi nuk zbret kurrë në ftesë të thjeshtë.
    update: grantsEntry ? { grantsEntry: true, invitedById: me.id } : {},
  });

  await notify({
    userId,
    category: "social",
    type: "voice_invite",
    actorId: me.id,
    targetId: roomId,
    targetType: "voice_room",
    groupKey: `voice_invite:${roomId}`,
    payload: { title: room.title },
  });

  return succeed("voice.invited");
}
