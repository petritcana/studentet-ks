import { describe, expect, it } from "vitest";
import {
  canCreateRoom,
  canJoinRoom,
  canModerate,
  canSpeak,
  clampCapacity,
  DEFAULT_ROOM_CAPACITY,
  MAX_ROOM_CAPACITY,
} from "@/lib/voice";

const viewer = {
  id: "u1",
  facultyId: "f1",
  universityId: "uni1",
  isPro: false,
  followsHost: false,
};

const room = {
  hostId: "host",
  scope: "faculty",
  status: "live",
  access: "open",
  facultyId: "f1",
  universityId: "uni1",
  maxParticipants: 25,
  liveCount: 3,
};

describe("hyrja në dhomë", () => {
  it("e lejon dikë nga i njëjti fakultet", () => {
    expect(canJoinRoom(viewer, room, true).allowed).toBe(true);
  });

  it("e ndal dikë nga një fakultet tjetër", () => {
    const verdict = canJoinRoom({ ...viewer, facultyId: "f9" }, room, true);
    expect(verdict.allowed).toBe(false);
  });

  it("e ndal një dhomë të mbyllur", () => {
    expect(canJoinRoom(viewer, { ...room, status: "ended" }, true).allowed).toBe(false);
  });

  it("ftesa e pritësit hap derën jashtë fakultetit dhe pa fjalëkalim", () => {
    const outsider = { ...viewer, facultyId: "f9", universityId: "uni9" };
    expect(canJoinRoom(outsider, { ...room, access: "password" }, false, true).allowed).toBe(true);
  });

  it("ftesa nuk e kalon kapacitetin as dhomën e mbyllur", () => {
    expect(canJoinRoom(viewer, { ...room, liveCount: 25 }, false, true).allowed).toBe(false);
    expect(canJoinRoom(viewer, { ...room, status: "ended" }, false, true).allowed).toBe(false);
  });

  it("e ndal kur dhoma është plot", () => {
    expect(canJoinRoom(viewer, { ...room, liveCount: 25 }, true).allowed).toBe(false);
  });

  it("e ndal me fjalëkalim të gabuar", () => {
    const verdict = canJoinRoom(viewer, { ...room, access: "password" }, false);
    expect(verdict.allowed).toBe(false);
    if (!verdict.allowed) expect(verdict.reason).toBe("voice.wrongPassword");
  });

  it("e lejon me fjalëkalim të saktë", () => {
    expect(canJoinRoom(viewer, { ...room, access: "password" }, true).allowed).toBe(true);
  });

  it("nuk e lejon fjalëkalimin ta kapërcejë rrethin e fakultetit", () => {
    // Lidhja e shpërndarë jashtë fakultetit nuk hyn, edhe kur fjalëkalimi dihet.
    const verdict = canJoinRoom(
      { ...viewer, facultyId: "f9" },
      { ...room, access: "password" },
      true,
    );
    expect(verdict.allowed).toBe(false);
    if (!verdict.allowed) expect(verdict.reason).toBe("voice.outsideFaculty");
  });

  it("kërkon Pro për një dhomë globale", () => {
    const verdict = canJoinRoom(viewer, { ...room, scope: "global" }, true);
    expect(verdict.allowed).toBe(false);
    if (!verdict.allowed) expect(verdict.reason).toBe("voice.globalNeedsPro");
  });

  it("e lejon një dhomë globale për Pro", () => {
    expect(canJoinRoom({ ...viewer, isPro: true }, { ...room, scope: "global" }, true).allowed).toBe(
      true,
    );
  });

  it("e lejon pritësin edhe kur dhoma është plot", () => {
    const host = { ...viewer, id: "host", facultyId: "f9" };
    expect(canJoinRoom(host, { ...room, liveCount: 99 }, false).allowed).toBe(true);
  });

  it("i lejon vetëm ndjekësit te një dhomë për ndjekësit", () => {
    expect(canJoinRoom(viewer, { ...room, scope: "followers" }, true).allowed).toBe(false);
    expect(
      canJoinRoom({ ...viewer, followsHost: true }, { ...room, scope: "followers" }, true).allowed,
    ).toBe(true);
  });
});

describe("hapja e dhomave", () => {
  it("e lejon të parën", () => {
    expect(canCreateRoom(0).allowed).toBe(true);
  });

  it("e ndal të dytën sa kohë e para është e hapur", () => {
    // Pa këtë kufi një llogari do ta mbushte listën me dhoma boshe.
    expect(canCreateRoom(1).allowed).toBe(false);
  });
});

describe("moderimi", () => {
  it("e lejon pritësin të nxjerrë një dëgjues", () => {
    expect(canModerate("host", "remove", "listener").allowed).toBe(true);
  });

  it("nuk e lejon askënd ta prekë pritësin", () => {
    expect(canModerate("host", "remove", "host").allowed).toBe(false);
    expect(canModerate("moderator", "mute", "host").allowed).toBe(false);
  });

  it("nuk e lejon moderatorin ta mbyllë dhomën", () => {
    expect(canModerate("moderator", "end", "listener").allowed).toBe(false);
  });

  it("nuk e lejon një moderator të prekë një tjetër", () => {
    expect(canModerate("moderator", "remove", "moderator").allowed).toBe(false);
  });

  it("nuk i jep folësit të drejta moderimi", () => {
    expect(canModerate("speaker", "mute", "listener").allowed).toBe(false);
    expect(canModerate("listener", "remove", "listener").allowed).toBe(false);
  });
});

describe("e drejta për të folur", () => {
  it("e ka pritësi, moderatori dhe folësi", () => {
    expect(canSpeak("host")).toBe(true);
    expect(canSpeak("moderator")).toBe(true);
    expect(canSpeak("speaker")).toBe(true);
  });

  it("nuk e ka dëgjuesi", () => {
    expect(canSpeak("listener")).toBe(false);
  });
});

describe("kapaciteti", () => {
  it("bie te parazgjedhja kur nuk jepet", () => {
    expect(clampCapacity(null)).toBe(DEFAULT_ROOM_CAPACITY);
    expect(clampCapacity(undefined)).toBe(DEFAULT_ROOM_CAPACITY);
  });

  it("nuk e kalon kufirin e platformës", () => {
    expect(clampCapacity(9999)).toBe(MAX_ROOM_CAPACITY);
  });

  it("nuk lejon një dhomë me një person", () => {
    expect(clampCapacity(1)).toBe(2);
  });
});
