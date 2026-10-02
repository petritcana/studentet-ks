import { describe, expect, it } from "vitest";
import {
  ACTIVITY_XP,
  CONTRIBUTION_XP,
  canExchange,
  daysForXp,
  LEVELS,
  levelFor,
  levelLabelKey,
  maxExchangeableDays,
  nextStreak,
  xpForDays,
} from "@/lib/xp";

describe("dy llojet e XP-së janë të ndara", () => {
  it("nuk e lejon aktivitetin të hyjë te kontributi", () => {
    const contribution = Object.keys(CONTRIBUTION_XP);
    const activity = Object.keys(ACTIVITY_XP);
    expect(contribution.some((key) => activity.includes(key))).toBe(false);
  });

  it("e shpërblen ndihmën shumë më shumë se praninë", () => {
    expect(CONTRIBUTION_XP.materialApproved).toBeGreaterThan(ACTIVITY_XP.post * 4);
    expect(CONTRIBUTION_XP.answerAccepted).toBeGreaterThan(ACTIVITY_XP.comment * 7);
    expect(ACTIVITY_XP.reaction).toBeLessThan(ACTIVITY_XP.comment);
  });

  it("e vlerëson ftesën e mbajtur si veprimin më të madh", () => {
    expect(CONTRIBUTION_XP.inviteRetained).toBe(Math.max(...Object.values(CONTRIBUTION_XP)));
  });
});

describe("këmbimi XP në Pro", () => {
  it("respekton kursin bazë", () => {
    expect(daysForXp(100)).toBe(1);
    expect(daysForXp(500)).toBe(5);
    expect(daysForXp(99)).toBe(0);
  });

  it("i jep zbritje paketave të mëdha", () => {
    expect(daysForXp(2500)).toBe(30);
    expect(daysForXp(10000)).toBe(150);
    // Ditë për ditë, 2.500 XP do të jepnin vetëm 25 ditë.
    expect(daysForXp(2500)).toBeGreaterThan(2500 / 100);
  });

  it("e kombinon mbetjen pas paketës së madhe", () => {
    expect(daysForXp(2700)).toBe(32);
    expect(daysForXp(10300)).toBe(153);
  });

  it("xpForDays është e kundërta e daysForXp për vlerat e sakta", () => {
    for (const days of [1, 5, 30, 31, 150, 180]) {
      expect(daysForXp(xpForDays(days))).toBeGreaterThanOrEqual(days);
    }
  });

  it("maxExchangeableDays nuk e kalon bilancin", () => {
    expect(maxExchangeableDays(0)).toBe(0);
    expect(maxExchangeableDays(340)).toBe(3);
  });
});

describe("mbrojtjet e këmbimit", () => {
  const now = new Date("2026-09-10T12:00:00Z");

  it("nuk lejon llogari nën shtatë ditë", () => {
    const fresh = { createdAt: new Date("2026-09-08T12:00:00Z"), xpContribution: 5000 };
    expect(canExchange(fresh, now)).toEqual({ ok: false, reason: "too-new" });
  });

  it("nuk lejon këmbim nën një ditë të plotë", () => {
    const poor = { createdAt: new Date("2026-01-01"), xpContribution: 40 };
    expect(canExchange(poor, now)).toEqual({ ok: false, reason: "not-enough" });
  });

  it("lejon llogari të vjetër me bilanc të mjaftueshëm", () => {
    const ok = { createdAt: new Date("2026-01-01"), xpContribution: 300 };
    expect(canExchange(ok, now)).toEqual({ ok: true });
  });
});

describe("nivelet", () => {
  it("janë dhjetë", () => {
    expect(LEVELS).toHaveLength(10);
  });

  it("nis te niveli i parë me zero XP", () => {
    expect(levelFor(0).key).toBe(LEVELS[0].key);
    expect(levelFor(0).percent).toBe(0);
  });

  it("pragjet rriten gjithmonë, kurrë nuk bien", () => {
    for (let index = 1; index < LEVELS.length; index += 1) {
      expect(LEVELS[index].min).toBeGreaterThan(LEVELS[index - 1].min);
    }
  });

  it("rritja është e ashpër, jo lineare", () => {
    // Hapi i fundit duhet te jete shumë me i madh se i pari, përndryshe niveli i
    // dhjetë do te arrihej për një javë.
    const firstStep = LEVELS[1].min - LEVELS[0].min;
    const lastStep = LEVELS[LEVELS.length - 1].min - LEVELS[LEVELS.length - 2].min;
    expect(lastStep).toBeGreaterThan(firstStep * 5);
  });

  it("kalon nivel pikërisht te pragu, jo një pikë më parë", () => {
    for (let index = 1; index < LEVELS.length; index += 1) {
      expect(levelFor(LEVELS[index].min - 1).key).toBe(LEVELS[index - 1].key);
      expect(levelFor(LEVELS[index].min).key).toBe(LEVELS[index].key);
    }
  });

  it("e mbyll shkallën te niveli i fundit", () => {
    const top = levelFor(999999);
    expect(top.key).toBe(LEVELS[LEVELS.length - 1].key);
    expect(top.next).toBeNull();
    expect(top.percent).toBe(100);
  });

  it("nuk del kurrë jashtë kufijve", () => {
    for (const xp of [-100, 0, 1, 99, 100, 5500, 19999, 20000, 100000]) {
      const level = levelFor(xp);
      expect(level.percent).toBeGreaterThanOrEqual(0);
      expect(level.percent).toBeLessThanOrEqual(100);
    }
  });

  it("çdo nivel ka çelësin e vet të përkthimit", () => {
    const keys = LEVELS.map((level) => levelLabelKey(level.key));
    expect(new Set(keys).size).toBe(LEVELS.length);
  });
});

describe("streak-u", () => {
  const base = { dailyStreak: 5, streakFreeze: 2 };
  const today = new Date("2026-09-10T20:00:00Z");

  it("nuk ndryshon nëse dita është numëruar tashmë", () => {
    const result = nextStreak(
      { ...base, lastStreakAt: new Date("2026-09-10T08:00:00Z") },
      today,
    );
    expect(result.changed).toBe(false);
    expect(result.streak).toBe(5);
  });

  it("rritet me një ditë të njëpasnjëshme", () => {
    const result = nextStreak({ ...base, lastStreakAt: new Date("2026-09-09T20:00:00Z") }, today);
    expect(result.streak).toBe(6);
    expect(result.usedFreeze).toBe(false);
  });

  it("e mbulon një ditë të humbur me ngrirje", () => {
    const result = nextStreak({ ...base, lastStreakAt: new Date("2026-09-08T20:00:00Z") }, today);
    expect(result.streak).toBe(6);
    expect(result.usedFreeze).toBe(true);
    expect(result.freeze).toBe(1);
  });

  it("nis nga një kur ngrirjet mbarojnë", () => {
    const result = nextStreak(
      { dailyStreak: 12, streakFreeze: 0, lastStreakAt: new Date("2026-09-08T20:00:00Z") },
      today,
    );
    expect(result.streak).toBe(1);
  });

  it("nis nga një pas një mungese të gjatë", () => {
    const result = nextStreak({ ...base, lastStreakAt: new Date("2026-08-01") }, today);
    expect(result.streak).toBe(1);
  });
});
