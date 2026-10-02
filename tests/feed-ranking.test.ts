import { describe, expect, it } from "vitest";
import {
  applyDiversity,
  engagementQuality,
  FEED_WEIGHTS,
  freshness,
  interleave,
  penalty,
  rankPosts,
  scorePost,
  socialAffinity,
  academicRelevance,
  type RankablePost,
} from "@/lib/feed-ranking";

const now = new Date("2026-03-10T12:00:00Z");

function post(overrides: Partial<RankablePost> = {}): RankablePost {
  return {
    id: "p1",
    authorId: "u1",
    createdAt: now,
    courseId: "c1",
    facultyId: "f1",
    authorYear: 2,
    authorIsVerified: true,
    authorCreatedAt: new Date("2025-01-01T00:00:00Z"),
    likeCount: 0,
    commentCount: 0,
    saveCount: 0,
    reportCount: 0,
    type: "text",
    ...overrides,
  };
}

const context = {
  now,
  viewerId: "me",
  followingIds: new Set(["u1"]),
  mutualIds: new Set(["u1"]),
  secondDegreeCounts: new Map<string, number>(),
  courseIds: new Set(["c1"]),
  facultyId: "f1",
  year: 2,
};

describe("peshat e renditjes", () => {
  it("mbledhin saktësisht 1", () => {
    const total = Object.values(FEED_WEIGHTS).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(1, 5);
  });
});

describe("afërsia sociale", () => {
  it("e vlerëson shokun më shumë se të panjohurin", () => {
    const friend = socialAffinity(post({ authorId: "u1" }), context);
    const stranger = socialAffinity(post({ authorId: "zzz" }), context);
    expect(friend).toBeGreaterThan(stranger);
  });
});

describe("relevanca akademike", () => {
  it("e vlerëson lëndën time më shumë se një lëndë të huaj", () => {
    const mine = academicRelevance(post({ courseId: "c1" }), context);
    const other = academicRelevance(post({ courseId: "c9", facultyId: "f9" }), context);
    expect(mine).toBeGreaterThan(other);
  });
});

describe("freskia", () => {
  it("bie në gjysmë pas tetë orësh", () => {
    const fresh = freshness(post({ createdAt: now }), now);
    const older = freshness(
      post({ createdAt: new Date(now.getTime() - 8 * 3_600_000) }),
      now,
    );
    expect(older / fresh).toBeCloseTo(0.5, 2);
  });

  it("nuk del kurrë negative", () => {
    const ancient = freshness(post({ createdAt: new Date("2020-01-01") }), now);
    expect(ancient).toBeGreaterThanOrEqual(0);
  });
});

describe("cilësia e angazhimit", () => {
  it("i peshon ruajtjet dhe komentet më shumë se pëlqimet", () => {
    const likes = engagementQuality(post({ likeCount: 30 }));
    const saves = engagementQuality(post({ saveCount: 30 }));
    expect(saves).toBeGreaterThan(likes);
  });
});

describe("penalizimet", () => {
  it("ndëshkojnë përmbajtjen e raportuar", () => {
    expect(penalty(post({ reportCount: 3 }), now)).toBeGreaterThan(0);
  });

  it("ndëshkojnë autorin e ri dhe të paverifikuar", () => {
    const rookie = penalty(
      post({ authorIsVerified: false, authorCreatedAt: new Date(now.getTime() - 3_600_000) }),
      now,
    );
    expect(rookie).toBeGreaterThan(0);
  });
});

describe("rezultati i përgjithshëm", () => {
  it("qëndron brenda një kufiri të arsyeshëm", () => {
    const score = scorePost(post({ likeCount: 10, saveCount: 5 }), context);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1.5);
  });

  it("rendit postimin relevant mbi të parelevantin", () => {
    const ranked = rankPosts(
      [
        post({ id: "larg", authorId: "zzz", courseId: "c9", facultyId: "f9" }),
        post({ id: "afer", authorId: "u1", courseId: "c1" }),
      ],
      context,
    );
    expect(ranked[0].id).toBe("afer");
  });
});

describe("shumëllojshmëria", () => {
  it("nuk lejon tri postime rresht nga i njëjti autor", () => {
    const posts = [
      { ...post({ id: "a1", authorId: "u1" }), score: 0.9 },
      { ...post({ id: "a2", authorId: "u1" }), score: 0.8 },
      { ...post({ id: "a3", authorId: "u1" }), score: 0.7 },
      { ...post({ id: "b1", authorId: "u2" }), score: 0.1 },
    ];

    const ordered = applyDiversity(posts);
    let streak = 1;
    for (let index = 1; index < ordered.length; index += 1) {
      streak = ordered[index].authorId === ordered[index - 1].authorId ? streak + 1 : 1;
      expect(streak).toBeLessThanOrEqual(2);
    }
  });
});

describe("ndërthurja", () => {
  it("fut një njësi jo-postuese çdo pesë postime", () => {
    const units = interleave(Array.from({ length: 10 }, (_, index) => index), {
      every: 5,
      showAds: false,
    });
    const nonPosts = units.filter((unit) => unit.kind !== "post");
    expect(nonPosts).toHaveLength(2);
  });

  it("nuk fut asnjë reklamë kur reklamat janë të fikura", () => {
    const units = interleave(Array.from({ length: 30 }, (_, index) => index), {
      showAds: false,
    });
    expect(units.some((unit) => unit.kind === "ad")).toBe(false);
  });

  it("fut një reklamë çdo dymbëdhjetë postime kur janë të ndezura", () => {
    const units = interleave(Array.from({ length: 24 }, (_, index) => index), {
      adEvery: 12,
      showAds: true,
    });
    expect(units.filter((unit) => unit.kind === "ad")).toHaveLength(2);
  });
});
