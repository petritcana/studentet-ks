import { describe, expect, it } from "vitest";
import {
  aiLimits,
  allowedScopes,
  canDownloadMaterial,
  canPostWithScope,
  canViewMaterial,
  decorateMaterials,
  isPro,
  materialAccessFilter,
  proExpiresAt,
  shouldSeeAds,
  type AccessMaterial,
  type AccessUser,
} from "@/lib/access";

const NOW = new Date("2026-09-10T12:00:00Z");
const LATER = new Date("2026-12-01T00:00:00Z");
const EARLIER = new Date("2026-01-01T00:00:00Z");

function user(overrides: Partial<AccessUser> = {}): AccessUser {
  return {
    id: "me",
    role: "student",
    universityId: "up",
    facultyId: "fiek",
    enrollments: [{ courseId: "algo" }],
    subscriptions: [],
    proEarnedUntil: null,
    ...overrides,
  };
}

function material(
  overrides: {
    courseId?: string;
    facultyId?: string;
    universityId?: string;
    isHidden?: boolean;
    uploaderId?: string;
  } = {},
): AccessMaterial {
  return {
    id: "m1",
    courseId: overrides.courseId ?? "algo",
    isHidden: overrides.isHidden ?? false,
    uploaderId: overrides.uploaderId,
    course: {
      department: {
        facultyId: overrides.facultyId ?? "fiek",
        faculty: { universityId: overrides.universityId ?? "up" },
      },
    },
  };
}

describe("isPro është i vetmi burim i së vërtetës", () => {
  it("kthen false pa abonim dhe pa ditë të fituara", () => {
    expect(isPro(user(), NOW)).toBe(false);
  });

  it("e njeh abonimin aktiv", () => {
    expect(isPro(user({ subscriptions: [{ status: "active", expiresAt: LATER }] }), NOW)).toBe(true);
  });

  it("nuk e njeh abonimin e skaduar", () => {
    expect(isPro(user({ subscriptions: [{ status: "active", expiresAt: EARLIER }] }), NOW)).toBe(
      false,
    );
  });

  it("nuk e njeh abonimin e anuluar edhe nëse data s'ka kaluar", () => {
    expect(isPro(user({ subscriptions: [{ status: "cancelled", expiresAt: LATER }] }), NOW)).toBe(
      false,
    );
  });

  it("e njeh Pro-n e fituar nga kontributi njësoj si të paguarën", () => {
    expect(isPro(user({ proEarnedUntil: LATER }), NOW)).toBe(true);
  });

  it("ia jep adminit gjithmonë", () => {
    expect(isPro(user({ role: "admin" }), NOW)).toBe(true);
  });

  it("kthen false për të paidentifikuarin", () => {
    expect(isPro(null, NOW)).toBe(false);
    expect(isPro(undefined, NOW)).toBe(false);
  });

  it("e kthen datën më të largët si skadim", () => {
    const both = user({
      proEarnedUntil: new Date("2026-10-01"),
      subscriptions: [{ status: "active", expiresAt: LATER }],
    });
    expect(proExpiresAt(both, NOW)?.toISOString()).toBe(LATER.toISOString());
  });
});

describe("rrethi 1: lëndët e mia", () => {
  it("e hap materialin e një lënde ku jam i regjistruar", () => {
    expect(canViewMaterial(user(), material({ courseId: "algo" }), NOW)).toEqual({
      allowed: true,
      reason: "own-course",
    });
  });
});

describe("rrethi 2: fakulteti im i tërë", () => {
  it("e hap materialin e një viti tjetër të fakultetit tim, falas", () => {
    expect(
      canViewMaterial(user({ enrollments: [] }), material({ courseId: "rrjeta" }), NOW),
    ).toEqual({ allowed: true, reason: "own-faculty" });
  });

  it("nuk kërkon Pro për asnjë lëndë të fakultetit tim", () => {
    for (const courseId of ["algo", "rrjeta", "so", "bdt"]) {
      expect(canViewMaterial(user(), material({ courseId }), NOW).allowed).toBe(true);
    }
  });
});

describe("rrethi 3: fakultete të tjera brenda universitetit", () => {
  const other = material({ courseId: "biokimi", facultyId: "fshmn", universityId: "up" });

  it("e kyç për përdoruesin falas", () => {
    expect(canViewMaterial(user(), other, NOW)).toEqual({ allowed: false, reason: "locked" });
  });

  it("e hap me Pro të paguar", () => {
    const pro = user({ subscriptions: [{ status: "active", expiresAt: LATER }] });
    expect(canViewMaterial(pro, other, NOW)).toEqual({ allowed: true, reason: "pro" });
  });

  it("e hap edhe me Pro të fituar nga kontributi", () => {
    expect(canViewMaterial(user({ proEarnedUntil: LATER }), other, NOW).allowed).toBe(true);
  });
});

describe("rrethi 4: universitete të tjera", () => {
  const foreign = material({ courseId: "mng", facultyId: "ubt-cs", universityId: "ubt" });

  it("e kyç për përdoruesin falas", () => {
    expect(canViewMaterial(user(), foreign, NOW).allowed).toBe(false);
  });

  it("e hap me Pro", () => {
    expect(canViewMaterial(user({ proEarnedUntil: LATER }), foreign, NOW).allowed).toBe(true);
  });
});

describe("rastet e veçanta", () => {
  it("materiali im mbetet i imi edhe nëse ndërroj fakultet", () => {
    const moved = user({ facultyId: "ekonomik", enrollments: [] });
    expect(canViewMaterial(moved, material({ uploaderId: "me" }), NOW)).toEqual({
      allowed: true,
      reason: "own-upload",
    });
  });

  it("materiali i fshehur nuk hapet as me Pro", () => {
    expect(
      canViewMaterial(user({ proEarnedUntil: LATER }), material({ isHidden: true }), NOW).allowed,
    ).toBe(false);
  });

  it("i paidentifikuari nuk hap asgjë", () => {
    expect(canViewMaterial(null, material(), NOW).allowed).toBe(false);
  });

  it("shkarkimi ndjek saktësisht shikimin", () => {
    const people = [user(), user({ proEarnedUntil: LATER }), user({ enrollments: [] })];
    const targets = [material(), material({ facultyId: "fshmn" }), material({ isHidden: true })];

    for (const person of people) {
      for (const target of targets) {
        expect(canDownloadMaterial(person, target, NOW)).toEqual(
          canViewMaterial(person, target, NOW),
        );
      }
    }
  });
});

describe("parapamje, jo padukshmëri", () => {
  it("i kthen të gjitha materialet, edhe ato të kyçurat", () => {
    const list = [
      material({ courseId: "algo" }),
      material({ courseId: "biokimi", facultyId: "fshmn" }),
      material({ courseId: "mng", facultyId: "ubt-cs", universityId: "ubt" }),
    ];

    const decorated = decorateMaterials(user(), list, NOW);
    expect(decorated).toHaveLength(3);
    expect(decorated.map((item) => item.access.allowed)).toEqual([true, false, false]);
  });
});

describe("shtrirja e postimit", () => {
  it("i lejon falas fakultetin dhe ndjekësit", () => {
    for (const scope of ["faculty", "followers"] as const) {
      expect(canPostWithScope(user(), scope, NOW).allowed).toBe(true);
    }
  });

  it("i kyç universitetin dhe kombëtaren për falasin", () => {
    for (const scope of ["university", "national"] as const) {
      expect(canPostWithScope(user(), scope, NOW).allowed).toBe(false);
    }
  });

  it("i hap të gjitha me Pro", () => {
    const pro = user({ proEarnedUntil: LATER });
    for (const scope of ["faculty", "followers", "university", "national"] as const) {
      expect(canPostWithScope(pro, scope, NOW).allowed).toBe(true);
    }
  });

  it("kthen listë të plotë shtrirjesh, që zgjedhësi t'i shfaqë të kyçurat", () => {
    const scopes = allowedScopes(user(), NOW);
    expect(scopes).toHaveLength(4);
    // Fakulteti dhe ndjekësit janë falas, universiteti dhe kombëtarja me Pro.
    expect(scopes.filter((item) => item.allowed)).toHaveLength(2);
  });
});

describe("filtri i query-ve", () => {
  it("nuk e kufizon Pro-n përveç materialeve të fshehura", () => {
    expect(materialAccessFilter(user({ proEarnedUntil: LATER }), NOW)).toEqual({ isHidden: false });
  });

  it("e kufizon falasin te lëndët, fakulteti dhe ngarkimet e veta", () => {
    const filter = materialAccessFilter(user(), NOW) as { OR: unknown[] };
    expect(filter.OR).toHaveLength(3);
  });

  it("nuk kthen asgjë për të paidentifikuarin", () => {
    expect(materialAccessFilter(null)).toEqual({ id: "__none__" });
  });
});

describe("reklamat dhe kufijtë e AI-së", () => {
  it("nuk u shfaq reklama përdoruesve Pro", () => {
    expect(shouldSeeAds(user(), NOW)).toBe(true);
    expect(shouldSeeAds(user({ proEarnedUntil: LATER }), NOW)).toBe(false);
    expect(shouldSeeAds(null, NOW)).toBe(false);
  });

  it("e ngre kufirin e asistentit vetëm me Pro", () => {
    expect(aiLimits(user(), NOW).messagesPerDay).toBe(10);
    expect(aiLimits(user({ proEarnedUntil: LATER }), NOW).messagesPerDay).toBe(200);
    expect(aiLimits(user(), NOW).uploads).toBe(false);
    expect(aiLimits(user({ proEarnedUntil: LATER }), NOW).uploads).toBe(true);
  });
});
