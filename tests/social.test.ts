import { describe, expect, it } from "vitest";
import { pseudonymFor } from "@/lib/moderation";
import { engagementQuality, REACTION_WEIGHTS, reactionScore } from "@/lib/feed-ranking";
import { REACTION_TYPES } from "@/lib/types";

describe("pseudonimi i Zërit të kampusit", () => {
  it("është i qëndrueshëm brenda së njëjtës fije", () => {
    const first = pseudonymFor("user-1", "post-a");
    const second = pseudonymFor("user-1", "post-a");
    expect(first).toBe(second);
  });

  it("ndryshon për të njëjtin autor në fije të ndryshme", () => {
    // Ndryshe, dy fije do te lidheshin me njera tjetren dhe anonimiteti do te binte.
    const inA = pseudonymFor("user-1", "post-a");
    const inB = pseudonymFor("user-1", "post-b");
    expect(inA).not.toBe(inB);
  });

  it("u jep autorëve të ndryshëm numra të ndryshëm në të njëjtën fije", () => {
    const one = pseudonymFor("user-1", "post-a");
    const two = pseudonymFor("user-2", "post-a");
    expect(one).not.toBe(two);
  });

  it("rri brenda një diapazoni që lexohet si emër", () => {
    for (const user of ["a", "b", "c", "dd", "eee", "ffff"]) {
      const value = pseudonymFor(user, "post-x");
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(99);
    }
  });
});

describe("peshat e reagimeve", () => {
  it("mbetet vetëm pëlqimi", () => {
    expect(REACTION_TYPES).toEqual(["like"]);
  });

  it("çdo lloj reagimi ka peshë", () => {
    for (const type of REACTION_TYPES) {
      expect(REACTION_WEIGHTS[type]).toBeGreaterThan(0);
    }
  });

  it("mbledh reagimet sipas peshës", () => {
    expect(reactionScore({ like: 3 })).toBe(3);
  });

  it("kthen zero pa reagime", () => {
    expect(reactionScore(undefined)).toBe(0);
    expect(reactionScore({})).toBe(0);
  });

  it("një lloj i panjohur peshon një, jo zero", () => {
    expect(reactionScore({ dicka: 4 })).toBe(4);
  });
});

describe("cilësia e angazhimit me reagime të tipizuara", () => {
  const base = {
    id: "p",
    authorId: "a",
    createdAt: new Date(),
    courseId: null,
    facultyId: null,
    authorYear: null,
    authorIsVerified: true,
    authorCreatedAt: new Date("2024-01-01"),
    likeCount: 0,
    commentCount: 0,
    saveCount: 0,
    reportCount: 0,
    type: "text",
  };

  it("një koment peshon më shumë se një pëlqim", () => {
    const commented = engagementQuality({ ...base, commentCount: 10 });
    const liked = engagementQuality({ ...base, reactions: { like: 10 } });
    expect(commented).toBeGreaterThan(liked);
  });

  it("ruajtjet mbeten sinjali më i fortë", () => {
    const saves = engagementQuality({ ...base, saveCount: 10 });
    const reactions = engagementQuality({ ...base, reactions: { like: 10 } });
    expect(saves).toBeGreaterThanOrEqual(reactions);
  });

  it("bie te likeCount kur reagimet mungojnë", () => {
    expect(engagementQuality({ ...base, likeCount: 12 })).toBeGreaterThan(0);
  });

  it("nuk del kurrë jashtë kufirit 0 deri 1", () => {
    const huge = engagementQuality({ ...base, reactions: { like: 10_000 }, saveCount: 500 });
    expect(huge).toBeGreaterThan(0);
    expect(huge).toBeLessThan(1);
  });
});
