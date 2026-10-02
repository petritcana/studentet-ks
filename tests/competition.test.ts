import { describe, expect, it } from "vitest";
import { suggestCategories } from "@/lib/competition/categories";
import { QUESTION_BANK } from "@/lib/competition/questions";
import {
  allowedPoints,
  battleWinner,
  crossedMilestone,
  DAILY_CAPS,
  DAILY_POINT_CAP,
  dayKey,
  earnedAchievements,
  eloUpdate,
  nextStreak,
  POINTS,
  seededPick,
  weekOf,
} from "@/lib/competition/rules";

describe("fituesi i betejës", () => {
  const a = { userId: "a", correct: 4, timeMs: 50_000, finished: true };
  const b = { userId: "b", correct: 3, timeMs: 20_000, finished: true };

  it("fiton ai me më shumë përgjigje të sakta, jo më i shpejti", () => {
    expect(battleWinner([a, b])).toBe("a");
  });

  it("me të njëjtin rezultat fiton më i shpejti", () => {
    expect(battleWinner([a, { ...b, correct: 4 }])).toBe("b");
  });

  it("barazim i plotë nuk ka fitues, as zero me zero", () => {
    expect(battleWinner([a, { ...a, userId: "b" }])).toBeNull();
    expect(battleWinner([{ ...a, correct: 0 }, { ...b, correct: 0 }])).toBeNull();
  });

  it("kush nuk e mbaroi humb ndaj atij që e mbaroi", () => {
    expect(battleWinner([{ ...a, finished: false }, b])).toBe("b");
  });

  it("pa kundërshtar nuk ka fitues", () => {
    expect(battleWinner([a])).toBeNull();
  });
});

describe("kufijtë e pikëve", () => {
  it("pas kufirit ditor të burimit nuk jepet asgjë", () => {
    expect(
      allowedPoints({ source: "battle_win", points: POINTS.battle_win, countedToday: DAILY_CAPS.battle_win, pointsToday: 0 }),
    ).toBe(0);
  });

  it("kuizi ditor numërohet vetëm një herë në ditë", () => {
    expect(allowedPoints({ source: "daily_quiz", points: 10, countedToday: 1, pointsToday: 10 })).toBe(0);
  });

  it("tavani ditor e pret shpërblimin e fundit", () => {
    expect(
      allowedPoints({ source: "material_approved", points: 20, countedToday: 0, pointsToday: DAILY_POINT_CAP - 5 }),
    ).toBe(5);
    expect(allowedPoints({ source: "material_approved", points: 20, countedToday: 0, pointsToday: DAILY_POINT_CAP })).toBe(0);
  });
});

describe("vlerësimi, dita dhe java", () => {
  it("Elo e shpërblen fitoren kundër më të fortit", () => {
    const upset = eloUpdate(1000, 1400, 1);
    const expected = eloUpdate(1400, 1000, 1);
    expect(upset.a - 1000).toBeGreaterThan(expected.a - 1400);
    expect(upset.a + upset.b).toBe(2400);
  });

  it("dita dhe java llogariten në orën e Kosovës", () => {
    // 23:30 UTC e 23 shtatorit është 01:30 e 24 shtatorit në Prishtinë.
    expect(dayKey(new Date("2026-09-23T23:30:00Z"))).toBe("2026-09-24");
    const week = weekOf(new Date("2026-09-24T10:00:00Z"));
    expect(week.key).toBe("2026-W39");
    expect(week.startsAt.toISOString()).toBe("2026-09-20T22:00:00.000Z");
    expect(week.endsAt.getTime() - week.startsAt.getTime()).toBe(7 * 86_400_000);
  });

  it("seria rritet një ditë pas tjetrës dhe rinis pas pushimit", () => {
    expect(nextStreak("2026-09-23", 3, "2026-09-24")).toBe(4);
    expect(nextStreak("2026-09-24", 4, "2026-09-24")).toBe(4);
    expect(nextStreak("2026-09-20", 4, "2026-09-24")).toBe(1);
  });
});

describe("arritjet dhe pragjet", () => {
  it("arritjet hapen nga numrat e vërtetë", () => {
    const earned = earnedAchievements({ wins: 25, battles: 30, contributions: 2, points: 400, streak: 7, daily: 3 });
    expect(earned).toContain("comp_first_win");
    expect(earned).toContain("comp_quiz_master");
    expect(earned).toContain("comp_seven_days");
    expect(earned).not.toContain("comp_battle_veteran");
  });

  it("pragu i universitetit shënohet vetëm kur kalohet", () => {
    expect(crossedMilestone(990, 1010)).toBe(1000);
    expect(crossedMilestone(1010, 1030)).toBeNull();
  });
});

describe("pyetjet dhe kategoritë", () => {
  it("çdo pyetje ka katër alternativa dhe një përgjigje të saktë të vlefshme", () => {
    for (const rows of Object.values(QUESTION_BANK)) {
      expect(rows.length).toBeGreaterThanOrEqual(5);
      for (const [prompt, options, correct] of rows) {
        expect(prompt.length).toBeGreaterThan(5);
        expect(new Set(options).size).toBe(4);
        expect(correct).toBeGreaterThanOrEqual(0);
        expect(correct).toBeLessThan(4);
      }
    }
  });

  it("e njëjta farë jep të njëjtat pyetje, pa përsëritje", () => {
    const items = Array.from({ length: 30 }, (_, index) => `q${index}`);
    const first = seededPick(items, 5, "daily:2026-09-24");
    expect(seededPick(items, 5, "daily:2026-09-24")).toEqual(first);
    expect(new Set(first).size).toBe(5);
  });

  it("kategoritë e studimeve dalin të parat", () => {
    expect(suggestCategories("Fakulteti Ekonomik, Banka dhe Financa")[0]).toBe("economics");
    expect(suggestCategories(null)).toContain("general");
  });
});
