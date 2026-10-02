import { describe, expect, it } from "vitest";
import {
  AUTO_REMOVE_MIN_RATINGS,
  AUTO_REMOVE_RATING,
  COMMUNITY_THRESHOLD,
  decideQuality,
  isHiddenState,
  QUALITY_ORDER,
  VERIFICATION_STATES,
  type QualitySignals,
} from "@/lib/quality";

function signals(overrides: Partial<QualitySignals> = {}): QualitySignals {
  return {
    status: "pending",
    rating: 0,
    ratingCount: 0,
    positiveCount: 0,
    reviewedByStaff: false,
    ...overrides,
  };
}

describe("tubi i cilësisë", () => {
  it("një material i ri rri në pritje", () => {
    expect(decideQuality(signals()).status).toBe("pending");
  });

  it("tri vlerësime pozitive e ngrenë te komuniteti", () => {
    const decision = decideQuality(signals({ positiveCount: COMMUNITY_THRESHOLD, ratingCount: 3 }));
    expect(decision.status).toBe("community");
    expect(decision.reason).toBe("community");
  });

  it("dy vlerësime pozitive nuk mjaftojnë", () => {
    expect(decideQuality(signals({ positiveCount: 2, ratingCount: 2 })).status).toBe("pending");
  });

  it("vendimi i njeriut e çon drejt te i verifikuar", () => {
    const decision = decideQuality(signals({ reviewedByStaff: true }));
    expect(decision.status).toBe("verified");
    expect(decision.reason).toBe("staff");
  });
});

describe("heqja automatike", () => {
  it("nën dy yje me pesë vlerësime, materiali hiqet", () => {
    const decision = decideQuality(
      signals({ rating: 1.5, ratingCount: AUTO_REMOVE_MIN_RATINGS, positiveCount: 0 }),
    );
    expect(decision.status).toBe("rejected");
    expect(decision.reason).toBe("low_rating");
  });

  it("nuk hiqet me më pak se pesë vlerësime, sado e ulët të jetë mesatarja", () => {
    expect(decideQuality(signals({ rating: 1, ratingCount: 4 })).status).not.toBe("rejected");
  });

  it("heqja fiton edhe mbi shenjen e komunitetit", () => {
    // Një material i keq me shenje komuniteti është me i demshem se një pa shenje.
    const decision = decideQuality(
      signals({ status: "community", rating: 1.2, ratingCount: 9, positiveCount: 3 }),
    );
    expect(decision.status).toBe("rejected");
  });

  it("heqja fiton edhe mbi vendimin e stafit", () => {
    const decision = decideQuality(
      signals({ reviewedByStaff: true, rating: 1.1, ratingCount: 10 }),
    );
    expect(decision.status).toBe("rejected");
  });

  it("mesatarja zero nuk e heq, sepse do të thotë pa vlerësime", () => {
    expect(decideQuality(signals({ rating: 0, ratingCount: 8 })).status).not.toBe("rejected");
  });

  it("saktësisht në prag nuk hiqet", () => {
    expect(
      decideQuality(signals({ rating: AUTO_REMOVE_RATING, ratingCount: 10 })).status,
    ).not.toBe("rejected");
  });
});

describe("qëndrueshmëria e gjendjes", () => {
  it("një material i verifikuar nuk bie mbrapsht te komuniteti", () => {
    const decision = decideQuality(
      signals({ status: "verified", positiveCount: 3, ratingCount: 4, rating: 4.5 }),
    );
    expect(decision.status).toBe("verified");
  });

  it("një i refuzuar mbetet i refuzuar pa vendim të ri", () => {
    expect(decideQuality(signals({ status: "rejected" })).status).toBe("rejected");
  });
});

describe("dukshmëria dhe rendi", () => {
  it("vetëm i refuzuari fshihet", () => {
    expect(isHiddenState("rejected")).toBe(true);
    expect(isHiddenState("pending")).toBe(false);
    expect(isHiddenState("community")).toBe(false);
    expect(isHiddenState("verified")).toBe(false);
  });

  it("të verifikuarit dalin të parët", () => {
    const sorted = [...VERIFICATION_STATES].sort((a, b) => QUALITY_ORDER[a] - QUALITY_ORDER[b]);
    expect(sorted[0]).toBe("verified");
    expect(sorted[sorted.length - 1]).toBe("rejected");
  });

  it("çdo gjendje ka një vend në rend", () => {
    for (const state of VERIFICATION_STATES) {
      expect(typeof QUALITY_ORDER[state]).toBe("number");
    }
  });
});
