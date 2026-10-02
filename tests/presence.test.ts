import { describe, expect, it } from "vitest";
import {
  AWAY_WINDOW_SECONDS,
  ONLINE_WINDOW_SECONDS,
  onlineSince,
  presenceStatus,
  visiblePresence,
} from "@/lib/presence";

const NOW = new Date("2026-09-16T12:00:00.000Z");

function secondsAgo(seconds: number) {
  return new Date(NOW.getTime() - seconds * 1000);
}

describe("statusi i pranisë", () => {
  it("e quan online dikë që sapo ka rrahur", () => {
    expect(presenceStatus(secondsAgo(5), NOW)).toBe("online");
  });

  it("e mban online deri në fund të dritares", () => {
    expect(presenceStatus(secondsAgo(ONLINE_WINDOW_SECONDS), NOW)).toBe("online");
  });

  it("kalon në i larguar pas dritares së online-it", () => {
    expect(presenceStatus(secondsAgo(ONLINE_WINDOW_SECONDS + 1), NOW)).toBe("away");
  });

  it("kalon jashtë linje pas dritares së të larguarit", () => {
    expect(presenceStatus(secondsAgo(AWAY_WINDOW_SECONDS + 1), NOW)).toBe("offline");
  });

  it("e quan jashtë linje atë që nuk është parë kurrë", () => {
    expect(presenceStatus(null, NOW)).toBe("offline");
  });

  it("nuk prishet nga një orë serveri që shkon prapa", () => {
    // Ora e bazës mund të jetë pak para asaj të aplikacionit. Kjo nuk duhet ta
    // nxjerrë studentin jashtë linje.
    expect(presenceStatus(new Date(NOW.getTime() + 5000), NOW)).toBe("online");
  });
});

describe("privatësia e pranisë", () => {
  it("e fsheh krejt statusin kur studenti e ka fikur", () => {
    const seen = visiblePresence(
      { lastSeenAt: secondsAgo(5), showOnlineStatus: false, showLastActive: true },
      NOW,
    );
    // Del si jashtë linje, jo si «e fshehur»: ndryshe do të tregonte pikërisht
    // atë që studenti deshi ta fshihte.
    expect(seen.status).toBe("offline");
    expect(seen.lastSeenAt).toBeNull();
  });

  it("e lejon pikën pa e treguar orarin", () => {
    const seen = visiblePresence(
      { lastSeenAt: secondsAgo(5), showOnlineStatus: true, showLastActive: false },
      NOW,
    );
    expect(seen.status).toBe("online");
    expect(seen.lastSeenAt).toBeNull();
  });

  it("i tregon të dyja kur studenti i ka lejuar", () => {
    const last = secondsAgo(5);
    const seen = visiblePresence(
      { lastSeenAt: last, showOnlineStatus: true, showLastActive: true },
      NOW,
    );
    expect(seen.status).toBe("online");
    expect(seen.lastSeenAt).toEqual(last);
  });
});

describe("filtri i query-së", () => {
  it("e kthen pikërisht kufirin e dritares së online-it", () => {
    const since = onlineSince(NOW);
    expect(NOW.getTime() - since.getTime()).toBe(ONLINE_WINDOW_SECONDS * 1000);
  });
});
