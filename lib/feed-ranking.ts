
export const FEED_WEIGHTS = {
  socialAffinity: 0.3,
  academicRelevance: 0.25,
  freshness: 0.2,
  engagementQuality: 0.15,
  diversity: 0.1,
} as const;

export const FRESHNESS_HALF_LIFE_HOURS = 8;

export const FEED_PENALTIES = {
  reported: 0.35,
  unverifiedNewAuthor: 0.15,
} as const;

export type RankablePost = {
  id: string;
  authorId: string;
  createdAt: Date;
  courseId: string | null;
  facultyId: string | null;
  authorYear: number | null;
  authorIsVerified: boolean;
  authorCreatedAt: Date;
  likeCount: number;
  /** Numëruesit sipas llojit. Kur mungon, bihet te `likeCount`. */
  reactions?: Record<string, number>;
  commentCount: number;
  saveCount: number;
  reportCount: number;
  type: string;
  /** Veçuar nga autori me Pro, derisa t'i kalojë afati. */
  featuredUntil?: Date | null;
};

export type RankingContext = {
  viewerId: string;
  followingIds: Set<string>;
  mutualIds: Set<string>;
  secondDegreeCounts: Map<string, number>;
  courseIds: Set<string>;
  facultyId: string | null;
  year: number | null;
  now?: Date;
};

export function socialAffinity(post: RankablePost, context: RankingContext): number {
  if (post.authorId === context.viewerId) return 0.9;
  if (context.mutualIds.has(post.authorId)) return 1;
  if (context.followingIds.has(post.authorId)) return 0.75;

  const mutualFriends = context.secondDegreeCounts.get(post.authorId) ?? 0;
  if (mutualFriends > 0) return Math.min(0.6, 0.2 + mutualFriends * 0.1);
  return 0;
}

export function academicRelevance(post: RankablePost, context: RankingContext): number {
  let score = 0;
  if (post.courseId && context.courseIds.has(post.courseId)) score += 0.6;
  if (post.facultyId && post.facultyId === context.facultyId) score += 0.25;
  if (post.authorYear !== null && post.authorYear === context.year) score += 0.15;
  if (post.type === "material" || post.type === "question") score += 0.1;
  return Math.min(1, score);
}

export function freshness(post: RankablePost, now: Date = new Date()): number {
  const hours = Math.max(0, (now.getTime() - post.createdAt.getTime()) / 3_600_000);
  return 2 ** (-hours / FRESHNESS_HALF_LIFE_HOURS);
}

/**
 * Pesha e çdo reagimi. Sot ka vetëm pëlqim; dobia matet nga ruajtjet dhe
 * komentet, që peshojnë tri herë më shumë te `engagementQuality`.
 */
export const REACTION_WEIGHTS: Record<string, number> = {
  like: 1,
};

export function reactionScore(reactions: Record<string, number> | undefined): number {
  if (!reactions) return 0;
  let total = 0;
  for (const [type, count] of Object.entries(reactions)) {
    total += (REACTION_WEIGHTS[type as keyof typeof REACTION_WEIGHTS] ?? 1) * count;
  }
  return total;
}

/**
 * Cilësia e angazhimit.
 *
 * Ruajtjet dhe komentet peshojnë tre herë më shumë se një reagim i thjeshtë,
 * sepse ruajtja është premtimi më i fortë që përmbajtja do të rilexohet.
 */
export function engagementQuality(post: RankablePost): number {
  const reactions = post.reactions ? reactionScore(post.reactions) : post.likeCount;
  const weighted = reactions + 3 * post.commentCount + 3 * post.saveCount;
  return weighted / (weighted + 12);
}

export function penalty(post: RankablePost, now: Date = new Date()): number {
  let total = 0;
  if (post.reportCount > 0) total += FEED_PENALTIES.reported * Math.min(1, post.reportCount / 3);

  const authorAgeDays = (now.getTime() - post.authorCreatedAt.getTime()) / 86_400_000;
  if (!post.authorIsVerified && authorAgeDays < 7) total += FEED_PENALTIES.unverifiedNewAuthor;

  return total;
}

/*
  Shtysa e veçimit.

  E matur me qëllim: e ngre postimin brenda atyre që studenti do t'i shihte
  gjithsesi, nuk e fut me forcë mbi gjithçka tjetër. Një shtysë e madhe do ta
  kthente feed-in në listë të paguar, dhe atëherë askush nuk do t'i besonte.
*/
const FEATURED_BOOST = 0.12;

export function scorePost(post: RankablePost, context: RankingContext): number {
  const now = context.now ?? new Date();
  const base =
    FEED_WEIGHTS.socialAffinity * socialAffinity(post, context) +
    FEED_WEIGHTS.academicRelevance * academicRelevance(post, context) +
    FEED_WEIGHTS.freshness * freshness(post, now) +
    FEED_WEIGHTS.engagementQuality * engagementQuality(post);

  const featured =
    post.featuredUntil && post.featuredUntil.getTime() > now.getTime() ? FEATURED_BOOST : 0;

  return Math.max(0, base + featured - penalty(post, now));
}

/** Dy postime radhazi nga i njëjti autor ndëshkohen, që një person të mos e zërë feed-in. */
export function applyDiversity<T extends { authorId: string; score: number }>(posts: T[]): T[] {
  const result: T[] = [];
  const pool = [...posts].sort((a, b) => b.score - a.score);

  while (pool.length > 0) {
    const lastAuthor = result[result.length - 1]?.authorId;
    let index = pool.findIndex((post) => post.authorId !== lastAuthor);
    if (index === -1) index = 0;
    result.push(pool.splice(index, 1)[0]);
  }
  return result;
}

export function rankPosts<T extends RankablePost>(
  posts: T[],
  context: RankingContext,
): (T & { score: number })[] {
  return applyDiversity(posts.map((post) => ({ ...post, score: scorePost(post, context) })));
}

/**
 * Rregull i artë: çdo 5 postime futet një njësi jo-postuese, dhe çdo 12 një
 * reklamë native. Reklama nuk shfaqet kurrë për përdoruesit Pro.
 */
export type FeedUnit<TPost> =
  | { kind: "post"; post: TPost }
  | { kind: "people" }
  | { kind: "material" }
  | { kind: "event" }
  | { kind: "question" }
  | { kind: "ad" };

const INTERSTITIALS = ["people", "material", "question", "event"] as const;

export function interleave<TPost>(
  posts: TPost[],
  options: {
    every?: number;
    adEvery?: number;
    showAds?: boolean;
    available?: Set<(typeof INTERSTITIALS)[number]>;
  } = {},
): FeedUnit<TPost>[] {
  const every = options.every ?? 5;
  const adEvery = options.adEvery ?? 12;
  const available = options.available ?? new Set(INTERSTITIALS);
  const units: FeedUnit<TPost>[] = [];
  let cursor = 0;

  posts.forEach((post, index) => {
    units.push({ kind: "post", post });
    const position = index + 1;

    if (options.showAds && position % adEvery === 0) {
      units.push({ kind: "ad" });
      return;
    }

    if (position % every === 0) {
      for (let attempt = 0; attempt < INTERSTITIALS.length; attempt += 1) {
        const kind = INTERSTITIALS[(cursor + attempt) % INTERSTITIALS.length];
        if (available.has(kind)) {
          units.push({ kind });
          cursor += attempt + 1;
          break;
        }
      }
    }
  });

  return units;
}
