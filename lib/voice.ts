/**
 * Rregullat e dhomave të zërit.
 *
 * Vetëm vendime, pa bazë të dhënash dhe pa React, që të provohen veçmas. Çdo gjë
 * që vendos se kush hyn, kush flet dhe kush heq dikë, kalon nga këtu, dhe serveri
 * e thërret këtë para se të shkruajë ndonjë rresht.
 */

export const VOICE_ROLES = ["host", "moderator", "speaker", "listener"] as const;
export type VoiceRole = (typeof VOICE_ROLES)[number];

export type VoiceAccess = "open" | "password";
export type VoiceStatus = "live" | "scheduled" | "ended";

/** Sa veta mban një dhomë. E ndryshueshme nga admini, jo e ngulitur. */
export const DEFAULT_ROOM_CAPACITY = 25;
export const MAX_ROOM_CAPACITY = 50;

/**
 * Sa dhoma të gjalla mban një pritës njëkohësisht.
 *
 * Një. Pa këtë kufi një llogari e vetme mund ta mbushte listën «Drejtpërdrejt»
 * me dhjetëra dhoma boshe, dhe zbulimi do të bëhej i padobishëm brenda një ditë.
 */
export const MAX_LIVE_ROOMS_PER_HOST = 1;

/** Pas sa sekondash pa rrahje një pjesëmarrës quhet i dalë. */
export const PARTICIPANT_TIMEOUT_SECONDS = 90;

export type RoomDecision = { allowed: true } | { allowed: false; reason: string };

const OK: RoomDecision = { allowed: true };
const no = (reason: string): RoomDecision => ({ allowed: false, reason });

export function canJoinRoom(
  viewer: {
    id: string;
    facultyId: string | null;
    universityId: string | null;
    isPro: boolean;
    followsHost: boolean;
  },
  room: {
    hostId: string;
    scope: string;
    status: string;
    access: string;
    facultyId: string | null;
    universityId: string | null;
    maxParticipants: number;
    liveCount: number;
  },
  passwordMatches: boolean,
  /** Ftesa nga pritësi ose moderatori: hap derën pavarësisht rrethit dhe fjalëkalimit, jo kapacitetit. */
  invited = false,
): RoomDecision {
  if (room.status === "ended") return no("voice.roomEnded");

  // Pritësi hyn gjithmonë te dhoma e vet, edhe kur është e mbushur.
  const isHost = viewer.id === room.hostId;

  if (!isHost && invited) {
    if (room.liveCount >= room.maxParticipants) return no("voice.roomFull");
    return OK;
  }

  if (!isHost) {
    if (room.scope === "faculty" && room.facultyId !== viewer.facultyId) {
      return no("voice.outsideFaculty");
    }
    if (room.scope === "university" && room.universityId !== viewer.universityId) {
      return no("voice.outsideUniversity");
    }
    if (room.scope === "followers" && !viewer.followsHost) {
      return no("voice.followersOnly");
    }
    if (room.scope === "global" && !viewer.isPro) {
      return no("voice.globalNeedsPro");
    }
    if (room.liveCount >= room.maxParticipants) {
      return no("voice.roomFull");
    }
    if (room.access === "password" && !passwordMatches) {
      return no("voice.wrongPassword");
    }
  }

  return OK;
}

/** A mund ta krijojë një dhomë të re. */
export function canCreateRoom(liveRoomsHosted: number): RoomDecision {
  if (liveRoomsHosted >= MAX_LIVE_ROOMS_PER_HOST) return no("voice.alreadyHosting");
  return OK;
}

/**
 * Veprimet e moderimit brenda dhomës.
 *
 * Pritësi mund gjithçka. Moderatori mund të heshtë dhe të nxjerrë, por jo ta
 * mbyllë dhomën dhe jo ta prekë pritësin: ndryshe një moderator do të mund ta
 * merrte dhomën nga dora e atij që e hapi.
 */
export function canModerate(
  actorRole: VoiceRole,
  action: "mute" | "remove" | "promote" | "demote" | "end",
  targetRole: VoiceRole,
): RoomDecision {
  if (targetRole === "host") return no("voice.cannotTouchHost");

  if (actorRole === "host") return OK;

  if (actorRole === "moderator") {
    if (action === "end") return no("voice.onlyHostEnds");
    if (targetRole === "moderator") return no("voice.cannotTouchModerator");
    return OK;
  }

  return no("voice.notAllowed");
}

/** A lejohet ky person të flasë tani. */
export function canSpeak(role: VoiceRole): boolean {
  return role === "host" || role === "moderator" || role === "speaker";
}

/** Kufizimi i madhësisë, brenda kufirit të platformës. */
export function clampCapacity(requested: number | null | undefined): number {
  if (!requested || !Number.isFinite(requested)) return DEFAULT_ROOM_CAPACITY;
  return Math.max(2, Math.min(MAX_ROOM_CAPACITY, Math.round(requested)));
}

/** Data para së cilës një pjesëmarrës nuk numërohet më si brenda. */
export function participantSince(now: Date = new Date()): Date {
  return new Date(now.getTime() - PARTICIPANT_TIMEOUT_SECONDS * 1000);
}
