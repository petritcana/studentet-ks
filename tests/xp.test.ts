import { describe, expect, it } from "vitest";
import { LEVELS, levelFor, XP_VALUES } from "@/lib/xp";

describe("vlerat e XP-së", () => {
  it("e shpërblejnë ndihmën më shumë se praninë", () => {
    expect(XP_VALUES.materialUpload).toBeGreaterThan(XP_VALUES.post);
    expect(XP_VALUES.acceptedAnswer).toBeGreaterThan(XP_VALUES.answer);
    expect(XP_VALUES.answer).toBeGreaterThan(XP_VALUES.comment);
    expect(XP_VALUES.dailyVisit).toBeLessThan(XP_VALUES.answer);
  });

  it("e vlerësojnë ftesën si veprimin me ndikimin më të madh", () => {
    const values = Object.values(XP_VALUES);
    expect(XP_VALUES.successfulInvite).toBe(Math.max(...values));
  });
});

describe("nivelet", () => {
  it("kanë emra studentorë, jo numra", () => {
    expect(LEVELS.map((level) => level.name)).toEqual([
      "Fillestar",
      "Kolegi",
      "Bartës shënimesh",
      "Shpëtimtar provimesh",
      "Legjendë e fakultetit",
    ]);
  });

  it("nisin nga Fillestar me zero XP", () => {
    const level = levelFor(0);
    expect(level.name).toBe("Fillestar");
    expect(level.index).toBe(0);
    expect(level.percent).toBe(0);
  });

  it("e llogarisin saktë progresin brenda një niveli", () => {
    const level = levelFor(625);
    expect(level.name).toBe("Kolegi");
    expect(level.next).toBe("Bartës shënimesh");
    expect(level.toNext).toBe(375);
    expect(level.percent).toBeCloseTo(50, 5);
  });

  it("e mbyllin shkallën te niveli i fundit", () => {
    const level = levelFor(999999);
    expect(level.name).toBe("Legjendë e fakultetit");
    expect(level.next).toBeNull();
    expect(level.toNext).toBe(0);
    expect(level.percent).toBe(100);
  });

  it("kalojnë nivel pikërisht te pragu", () => {
    expect(levelFor(249).name).toBe("Fillestar");
    expect(levelFor(250).name).toBe("Kolegi");
    expect(levelFor(2499).name).toBe("Bartës shënimesh");
    expect(levelFor(2500).name).toBe("Shpëtimtar provimesh");
  });

  it("nuk kthejnë kurrë përqindje jashtë kufijve", () => {
    for (const xp of [-100, 0, 1, 249, 250, 1000, 5999, 6000, 100000]) {
      const level = levelFor(xp);
      expect(level.percent).toBeGreaterThanOrEqual(0);
      expect(level.percent).toBeLessThanOrEqual(100);
    }
  });
});
