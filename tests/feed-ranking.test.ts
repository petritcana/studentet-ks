import { describe, expect, it } from "vitest";
import {
  academicRelevance,
  applyDiversity,
  engagementQuality,
  FEED_WEIGHTS,
  freshness,
  interleave,
  rankPosts,
  scorePost,
  socialAffinity,
  type RankablePost,
  type RankingContext,
} from "@/lib/feed-ranking";

const NOW = new Date("2026-09-09T12:00:00Z");

function post(overrides: Partial<RankablePost> = {}): RankablePost {
  return {
    id: "p1",
    authorId: "u1",
    createdAt: NOW,
    courseId: null,
    facultyId: null,
    authorFacultyId: null,
    authorYear: null,
    authorIsVerified: true,
    authorCreatedAt: new Date("2024-01-01T00:00:00Z"),
    likeCount: 0,
    commentCount: 0,
    saveCount: 0,
    reportCount: 0,
    type: "text",
    ...overrides,
  };
}

function context(overrides: Partial<RankingContext> = {}): RankingContext {
  return {
    viewerId: "me",
    followingIds: new Set(),
    mutualIds: new Set(),
    secondDegreeCounts: new Map(),
    courseIds: new Set(),
    facultyId: null,
    year: null,
    now: NOW,
    ...overrides,
  };
}

describe("peshat e renditjes", () => {
  it("mbledhin saktësisht një", () => {
    const total = Object.values(FEED_WEIGHTS).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(1, 10);
  });
});

describe("afërsia sociale", () => {
  it("i jep maksimumin një shoku të ndërsjellë", () => {
    const result = socialAffinity(post({ authorId: "a" }), context({ mutualIds: new Set(["a"]) }));
    expect(result).toBe(1);
  });

  it("e vlerëson më pak dikë që thjesht e ndjek", () => {
    const mutual = socialAffinity(post({ authorId: "a" }), context({ mutualIds: new Set(["a"]) }));
    const following = socialAffinity(
      post({ authorId: "a" }),
      context({ followingIds: new Set(["a"]) }),
    );
    expect(following).toBeLessThan(mutual);
    expect(following).toBeGreaterThan(0);
  });

  it("e njeh një të panjohur vetëm përmes shokëve të përbashkët", () => {
    const withMutuals = socialAffinity(
      post({ authorId: "a" }),
      context({ secondDegreeCounts: new Map([["a", 3]]) }),
    );
    const stranger = socialAffinity(post({ authorId: "a" }), context());
    expect(stranger).toBe(0);
    expect(withMutuals).toBeGreaterThan(0);
  });
});

describe("relevanca akademike", () => {
  it("e ngre postimin e një lënde që e kam", () => {
    const mine = academicRelevance(
      post({ courseId: "c1" }),
      context({ courseIds: new Set(["c1"]) }),
    );
    const other = academicRelevance(post({ courseId: "c2" }), context({ courseIds: new Set(["c1"]) }));
    expect(mine).toBeGreaterThan(other);
  });

  it("nuk e kalon kurrë njëshin", () => {
    const value = academicRelevance(
      post({ courseId: "c1", facultyId: "f1", authorYear: 2, type: "material" }),
      context({ courseIds: new Set(["c1"]), facultyId: "f1", year: 2 }),
    );
    expect(value).toBeLessThanOrEqual(1);
  });
});

describe("freskia", () => {
  it("përgjysmohet për tetë orë", () => {
    const eightHoursAgo = new Date(NOW.getTime() - 8 * 3600 * 1000);
    expect(freshness(post({ createdAt: eightHoursAgo }), NOW)).toBeCloseTo(0.5, 5);
  });

  it("është një për diçka të sapopostuar", () => {
    expect(freshness(post({ createdAt: NOW }), NOW)).toBe(1);
  });
});

describe("cilësia e angazhimit", () => {
  it("i peshon ruajtjet dhe komentet tri herë më shumë se pëlqimet", () => {
    const likes = engagementQuality(post({ likeCount: 3 }));
    const comments = engagementQuality(post({ commentCount: 1 }));
    const saves = engagementQuality(post({ saveCount: 1 }));
    expect(comments).toBeCloseTo(likes, 10);
    expect(saves).toBeCloseTo(likes, 10);
    expect(engagementQuality(post({ commentCount: 3 }))).toBeGreaterThan(likes);
  });
});

describe("penalizimet", () => {
  it("e ulin postimin e raportuar", () => {
    const clean = scorePost(post(), context());
    const reported = scorePost(post({ reportCount: 3 }), context());
    expect(reported).toBeLessThan(clean);
  });

  it("e ulin autorin e ri të paverifikuar", () => {
    const fresh = scorePost(
      post({ authorIsVerified: false, authorCreatedAt: NOW }),
      context(),
    );
    const established = scorePost(post(), context());
    expect(fresh).toBeLessThan(established);
  });

  it("nuk e çojnë kurrë rezultatin nën zero", () => {
    const value = scorePost(
      post({
        reportCount: 99,
        authorIsVerified: false,
        authorCreatedAt: NOW,
        createdAt: new Date("2020-01-01"),
      }),
      context(),
    );
    expect(value).toBeGreaterThanOrEqual(0);
  });
});

describe("shumëllojshmëria", () => {
  it("nuk lejon dy postime radhazi nga i njëjti autor kur ka alternativë", () => {
    const ordered = applyDiversity([
      { authorId: "a", score: 1 },
      { authorId: "a", score: 0.9 },
      { authorId: "b", score: 0.8 },
    ]);
    expect(ordered.map((item) => item.authorId)).toEqual(["a", "b", "a"]);
  });

  it("nuk humb asnjë postim", () => {
    const input = Array.from({ length: 7 }).map((_, index) => ({
      authorId: index % 2 === 0 ? "a" : "b",
      score: 1 - index / 10,
    }));
    expect(applyDiversity(input)).toHaveLength(7);
  });
});

describe("renditja e plotë", () => {
  it("e vendos postimin e lëndës sime nga shoku im mbi një të panjohuri", () => {
    const relevant = post({
      id: "relevant",
      authorId: "friend",
      courseId: "c1",
      createdAt: NOW,
    });
    const irrelevant = post({
      id: "irrelevant",
      authorId: "stranger",
      createdAt: NOW,
    });

    const ranked = rankPosts(
      [irrelevant, relevant],
      context({ mutualIds: new Set(["friend"]), courseIds: new Set(["c1"]) }),
    );

    expect(ranked[0].id).toBe("relevant");
  });
});

describe("njësitë ndërmjetëse", () => {
  it("fut një njësi jo-postuese pas çdo pesë postimesh", () => {
    const units = interleave(Array.from({ length: 10 }).map((_, index) => index));
    const kinds = units.map((unit) => unit.kind);
    expect(kinds.filter((kind) => kind === "post")).toHaveLength(10);
    expect(kinds.filter((kind) => kind !== "post")).toHaveLength(2);
    expect(kinds[5]).not.toBe("post");
  });

  it("nuk fut njësi që nuk ekzistojnë", () => {
    const units = interleave(Array.from({ length: 5 }).map((_, index) => index), {
      available: new Set(["people"]),
    });
    expect(units[5].kind).toBe("people");
  });
});
