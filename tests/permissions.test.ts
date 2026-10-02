import { describe, expect, it } from "vitest";
import {
  can,
  hasFeature,
  isAdmin,
  isModerator,
  isTeacher,
  role,
  type Actor,
} from "@/lib/permissions";

const now = new Date("2026-05-10T12:00:00Z");

function actor(overrides: Partial<Actor> = {}): Actor {
  return {
    id: "u1",
    role: "student",
    universityId: "uni1",
    facultyId: "fak1",
    proEarnedUntil: null,
    subscriptions: [],
    enrollments: [],
    verification: "verified",
    accountAgeDays: 30,
    ...overrides,
  } as Actor;
}

const pro = actor({ proEarnedUntil: new Date("2026-06-10T00:00:00Z") });

describe("njohja e rolit", () => {
  it("kthen student për një rol të panjohur", () => {
    expect(role({ role: "sundimtar" })).toBe("student");
    expect(role(null)).toBe("student");
  });

  it("i njeh rolet e moderimit", () => {
    expect(isModerator({ role: "moderator" })).toBe(true);
    expect(isModerator({ role: "faculty_admin" })).toBe(true);
    expect(isModerator({ role: "student" })).toBe(false);
  });

  it("admini është gjithmonë edhe moderator", () => {
    expect(isModerator({ role: "admin" })).toBe(true);
    expect(isAdmin({ role: "admin" })).toBe(true);
    expect(isAdmin({ role: "moderator" })).toBe(false);
  });

  it("i njeh rolet që japin mësim", () => {
    expect(isTeacher({ role: "professor" })).toBe(true);
    expect(isTeacher({ role: "assistant" })).toBe(true);
    expect(isTeacher({ role: "student" })).toBe(false);
  });
});

describe("kontributi nuk bllokohet kurrë pas murit të pagesës", () => {
  for (const action of ["post", "comment", "upload", "ask", "answer", "message"] as const) {
    it(`${action} lejohet për një student falas të verifikuar`, () => {
      expect(can(actor(), action).allowed).toBe(true);
    });
  }

  it("as PRO nuk kërkohet për asnjë prej tyre", () => {
    expect(can(actor({ proEarnedUntil: null }), "upload").allowed).toBe(true);
  });
});

describe("verifikimi si kusht", () => {
  it("llogaria e paverifikuar poston, komenton dhe ngarkon", () => {
    for (const action of ["post", "comment", "upload", "message", "create_group"] as const) {
      expect(can(actor({ verification: "unverified" }), action).allowed).toBe(true);
    }
  });

  it("mesazhi te një i panjohur kërkon verifikim", () => {
    const decision = can(actor({ verification: "unverified" }), "message_stranger");
    expect(decision.allowed).toBe(false);
    expect(decision.allowed === false && decision.reason).toBe("verification");
  });

  it("eventi publik kërkon verifikim", () => {
    expect(can(actor({ verification: "pending" }), "create_event").allowed).toBe(false);
  });
});

describe("Zëri i kampusit", () => {
  it("kërkon shtatë ditë llogari", () => {
    const decision = can(actor({ accountAgeDays: 3 }), "campus_voice");
    expect(decision.allowed).toBe(false);
    expect(decision.allowed === false && decision.reason).toBe("account_age");
  });

  it("hapet pas shtatë ditësh", () => {
    expect(can(actor({ accountAgeDays: 7 }), "campus_voice").allowed).toBe(true);
  });

  it("nuk hapet pa verifikim, sado e vjetër të jetë llogaria", () => {
    expect(can(actor({ accountAgeDays: 400, verification: "unverified" }), "campus_voice").allowed).toBe(
      false,
    );
  });
});

describe("kurset me pagesë", () => {
  it("i krijon profesori i verifikuar", () => {
    expect(can(actor({ role: "professor" }), "create_course").allowed).toBe(true);
  });

  it("nuk i krijon studenti", () => {
    expect(can(actor(), "create_course").allowed).toBe(false);
  });

  it("publikimi kalon nga moderimi, jo nga vetë profesori", () => {
    expect(can(actor({ role: "professor" }), "publish_course").allowed).toBe(false);
    expect(can(actor({ role: "moderator" }), "publish_course").allowed).toBe(true);
  });
});

describe("veprimet e moderimit dhe të adminit", () => {
  it("studenti nuk moderon", () => {
    expect(can(actor(), "moderate").allowed).toBe(false);
    expect(can(actor(), "review_verification").allowed).toBe(false);
  });

  it("moderatori moderon, por nuk hyn te admini", () => {
    expect(can(actor({ role: "moderator" }), "moderate").allowed).toBe(true);
    expect(can(actor({ role: "moderator" }), "view_admin").allowed).toBe(false);
  });

  it("admini i ka të dyja", () => {
    expect(can(actor({ role: "admin" }), "moderate").allowed).toBe(true);
    expect(can(actor({ role: "admin" }), "manage_plans").allowed).toBe(true);
  });

  it("vetëm kompania shpall punë", () => {
    expect(can(actor({ role: "company" }), "post_job").allowed).toBe(true);
    expect(can(actor(), "post_job").allowed).toBe(false);
  });
});

describe("këmbimi i XP-së", () => {
  it("llogaritë nën shtatë ditë nuk këmbejnë", () => {
    expect(can(actor({ accountAgeDays: 2 }), "exchange_xp").allowed).toBe(false);
  });

  it("pas shtatë ditësh këmbejnë", () => {
    expect(can(actor({ accountAgeDays: 8 }), "exchange_xp").allowed).toBe(true);
  });
});

describe("hasFeature", () => {
  it("veçorite e PRO-s jane te mbyllura per llogarite falas", () => {
    expect(hasFeature(actor(), "global_feed", now)).toBe(false);
    expect(hasFeature(actor(), "no_ads", now)).toBe(false);
    expect(hasFeature(actor(), "cross_faculty_materials", now)).toBe(false);
  });

  it("PRO i hap të gjitha", () => {
    expect(hasFeature(pro, "global_feed", now)).toBe(true);
    expect(hasFeature(pro, "unlimited_assistant", now)).toBe(true);
    expect(hasFeature(pro, "cv_without_watermark", now)).toBe(true);
  });

  it("nje veçori jashte listes se PRO-s eshte e hapur per te gjithe", () => {
    expect(hasFeature(actor(), "pro_badge" as never, now)).toBe(false);
  });

  it("pa përdorues, asgjë nuk hapet", () => {
    expect(hasFeature(null, "global_feed", now)).toBe(false);
  });
});

describe("pa sesion", () => {
  it("asnjë veprim nuk lejohet", () => {
    expect(can(null, "post").allowed).toBe(false);
    expect(can(undefined, "moderate").allowed).toBe(false);
  });
});
