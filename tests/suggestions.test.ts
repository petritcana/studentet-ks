import { describe, expect, it } from "vitest";
import { describeContext, SUGGESTION_WEIGHTS } from "@/lib/suggestions";
import { screenText, meetsLevelTwo } from "@/lib/moderation";
import { contrastRatio, contrastLevel } from "@/lib/contrast";

describe("peshat e sugjerimeve", () => {
  it("e vendosin lëndën e përbashkët mbi gjithçka tjetër", () => {
    expect(SUGGESTION_WEIGHTS.sharedCourse).toBeGreaterThan(
      SUGGESTION_WEIGHTS.sameFacultyYear,
    );
    expect(SUGGESTION_WEIGHTS.sameFacultyYear).toBeGreaterThan(
      SUGGESTION_WEIGHTS.mutualFriend,
    );
    expect(SUGGESTION_WEIGHTS.mutualFriend).toBeGreaterThan(SUGGESTION_WEIGHTS.sameCity);
    expect(SUGGESTION_WEIGHTS.sameCity).toBeGreaterThan(SUGGESTION_WEIGHTS.sharedInterest);
  });
});

describe("konteksti i përbashkët", () => {
  it("e nis gjithmonë me arsyen më të fortë", () => {
    const reasons = describeContext({
      sharedCourses: 3,
      mutualFriends: 5,
      sameFacultyYear: true,
      facultyName: "Fakulteti Ekonomik",
      year: 2,
      sameCity: true,
      city: "Gjilan",
      sharedInterests: ["programim"],
      sameHighSchool: false,
    });

    expect(reasons[0]).toBe("3 lëndë të përbashkëta");
    expect(reasons[1]).toBe("5 shokë të përbashkët");
  });

  it("përdor njëjësin kur duhet", () => {
    const reasons = describeContext({
      sharedCourses: 1,
      mutualFriends: 1,
      sameFacultyYear: false,
      sameCity: false,
      sharedInterests: [],
      sameHighSchool: false,
    });
    expect(reasons).toEqual(["1 lëndë e përbashkët", "1 shok i përbashkët"]);
  });

  it("nuk shpik arsye kur nuk ka asnjë", () => {
    const reasons = describeContext({
      sharedCourses: 0,
      mutualFriends: 0,
      sameFacultyYear: false,
      sameCity: false,
      sharedInterests: [],
      sameHighSchool: false,
    });
    expect(reasons).toHaveLength(0);
  });
});

describe("filtri i moderimit", () => {
  it("lejon një postim normal studentor", () => {
    const verdict = screenText(
      "A e keni vërejtur që salla 4 s'ka ngrohje fare këtë javë?",
    );
    expect(verdict.allowed).toBe(true);
  });

  it("bllokon numrat e telefonit", () => {
    const verdict = screenText("Më shkruaj në 044 123 456, e zgjidhim shpejt.");
    expect(verdict.allowed).toBe(false);
    expect(verdict.category).toBe("personal_data");
  });

  it("bllokon emrat në postimet anonime", () => {
    const verdict = screenText("Arta Krasniqi e kopjoi provimin.", {
      anonymous: true,
      knownNames: ["Arta Krasniqi"],
    });
    expect(verdict.allowed).toBe(false);
    expect(verdict.category).toBe("targeting");
  });

  it("nuk e bllokon të njëjtin tekst kur nuk është anonim", () => {
    const verdict = screenText("Arta Krasniqi na ndihmoi me statistikë.", {
      knownNames: ["Arta Krasniqi"],
    });
    expect(verdict.allowed).toBe(true);
  });

  it("e kap gjuhën e urrejtjes pavarësisht diakritikave", () => {
    expect(screenText("duhet zhdukur krejt").allowed).toBe(false);
  });

  it("çdo bllokim vjen me një mesazh që ofron zgjidhje", () => {
    const verdict = screenText("Më shkruaj në 044 123 456.");
    expect(verdict.message).toBeTruthy();
    expect(verdict.message?.length).toBeGreaterThan(20);
  });
});

describe("niveli 2 i llogarisë", () => {
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 3600 * 1000);
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600 * 1000);

  it("kërkon email të verifikuar dhe shtatë ditë", () => {
    expect(meetsLevelTwo({ createdAt: eightDaysAgo, isVerified: true })).toBe(true);
    expect(meetsLevelTwo({ createdAt: eightDaysAgo, isVerified: false })).toBe(false);
    expect(meetsLevelTwo({ createdAt: twoDaysAgo, isVerified: true })).toBe(false);
  });
});

describe("kontrasti i paletës", () => {
  const light = { bg: "#FAFAF9", surface: "#FFFFFF", text: "#1C1917", muted: "#78716C" };
  const dark = { bg: "#0C0A09", surface: "#1C1917", text: "#FAFAF9", muted: "#A8A29E" };

  it("kalon AA për tekstin kryesor në të dyja temat", () => {
    expect(contrastRatio(light.text, light.bg)!).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.text, dark.bg)!).toBeGreaterThanOrEqual(4.5);
  });

  it("kalon AA për tekstin dytësor në të dyja temat", () => {
    expect(contrastRatio(light.muted, light.bg)!).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.muted, light.surface)!).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.muted, dark.bg)!).toBeGreaterThanOrEqual(4.5);
  });

  it("kalon AA për variantet semantike të tekstit", () => {
    expect(contrastRatio("#DC2626", light.bg)!).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#047857", light.surface)!).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#B45309", light.surface)!).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#C2410C", light.bg)!).toBeGreaterThanOrEqual(4.5);
  });

  it("kalon AA për tekstin mbi butonin kryesor", () => {
    expect(contrastRatio("#FFFFFF", "#4F46E5")!).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#1C1917", "#818CF8")!).toBeGreaterThanOrEqual(4.5);
  });

  it("e etiketon saktë nivelin", () => {
    expect(contrastLevel(21)).toBe("AAA");
    expect(contrastLevel(5)).toBe("AA");
    expect(contrastLevel(3.2)).toBe("AA-i-madh");
    expect(contrastLevel(1.5)).toBe("dështon");
  });
});
