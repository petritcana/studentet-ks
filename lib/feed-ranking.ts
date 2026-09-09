/**
 * Renditja e feed-it.
 *
 *   Score = 0.30 afërsi sociale
 *         + 0.25 relevancë akademike
 *         + 0.20 freski (kalbje eksponenciale, gjysmë-jeta 8 orë)
 *         + 0.15 cilësi angazhimi (ruajtje dhe komente 3x më shumë se pëlqime)
 *         + 0.10 shumëllojshmëri
 *         - penalizime
 *
 * Funksionet janë të pastra me qëllim: testohen pa bazë të dhënash dhe
 * ndryshimi i peshave nuk kërkon prekje të query-ve.
 */

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
  spamSuspicion: 0.5,
} as const;

export type RankablePost = {
  id: string;
  authorId: string;
  createdAt: Date;
  courseId: string | null;
  facultyId: string | null;
  authorFacultyId: string | null;
  authorYear: number | null;
  authorIsVerified: boolean;
  authorCreatedAt: Date;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  reportCount: number;
  type: string;
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

/** 0..1 — sa afër është autori në grafin social. */
export function socialAffinity(post: RankablePost, context: RankingContext): number {
  if (post.authorId === context.viewerId) return 0.9;
  if (context.mutualIds.has(post.authorId)) return 1;
  if (context.followingIds.has(post.authorId)) return 0.75;

  const mutualFriends = context.secondDegreeCounts.get(post.authorId) ?? 0;
  if (mutualFriends > 0) return Math.min(0.6, 0.2 + mutualFriends * 0.1);
  return 0;
}

/** 0..1 — sa i takon postimi lëndëve, fakultetit dhe vitit tim. */
export function academicRelevance(post: RankablePost, context: RankingContext): number {
  let score = 0;
  if (post.courseId && context.courseIds.has(post.courseId)) score += 0.6;
  if (post.facultyId && post.facultyId === context.facultyId) score += 0.25;
  if (post.authorYear !== null && post.authorYear === context.year) score += 0.15;
  if (post.type === "material" || post.type === "question") score += 0.1;
  return Math.min(1, score);
}

/** Kalbje eksponenciale me gjysmë-jetë 8 orë. */
export function freshness(post: RankablePost, now: Date = new Date()): number {
  const hours = Math.max(0, (now.getTime() - post.createdAt.getTime()) / 3_600_000);
  return 2 ** (-hours / FRESHNESS_HALF_LIFE_HOURS);
}

/**
 * Ruajtja dhe komenti peshojnë tri herë më shumë se pëlqimi, sepse tregojnë
 * dobi reale, jo miratim kalimtar.
 */
export function engagementQuality(post: RankablePost): number {
  const weighted = post.likeCount + 3 * post.commentCount + 3 * post.saveCount;
  return weighted / (weighted + 12);
}

export function penalty(post: RankablePost): number {
  let total = 0;
  if (post.reportCount > 0) total += FEED_PENALTIES.reported * Math.min(1, post.reportCount / 3);

  const authorAgeDays = (Date.now() - post.authorCreatedAt.getTime()) / 86_400_000;
  if (!post.authorIsVerified && authorAgeDays < 7) {
    total += FEED_PENALTIES.unverifiedNewAuthor;
  }
  return total;
}

export function scorePost(post: RankablePost, context: RankingContext): number {
  const now = context.now ?? new Date();
  const base =
    FEED_WEIGHTS.socialAffinity * socialAffinity(post, context) +
    FEED_WEIGHTS.academicRelevance * academicRelevance(post, context) +
    FEED_WEIGHTS.freshness * freshness(post, now) +
    FEED_WEIGHTS.engagementQuality * engagementQuality(post);

  return Math.max(0, base - penalty(post));
}

/**
 * Shumëllojshmëria zbatohet pas renditjes: dy postime radhazi nga i njëjti
 * autor ndëshkohen, kështu që një person i vetëm nuk e zë feed-in.
 */
export function applyDiversity<T extends { authorId: string; score: number }>(
  posts: T[],
): T[] {
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
  const scored = posts.map((post) => ({ ...post, score: scorePost(post, context) }));
  return applyDiversity(scored);
}

/**
 * Rregull i artë: çdo 5 postime futet një njësi jo-postuese, që feed-i të mbetet
 * i gjallë edhe kur komuniteti është i vogël.
 */
export type FeedUnit<TPost> =
  | { kind: "post"; post: TPost }
  | { kind: "people" }
  | { kind: "material" }
  | { kind: "event" }
  | { kind: "question" };

const INTERSTITIAL_ORDER = ["people", "material", "question", "event"] as const;

export function interleave<TPost>(
  posts: TPost[],
  options: { every?: number; available?: Set<(typeof INTERSTITIAL_ORDER)[number]> } = {},
): FeedUnit<TPost>[] {
  const every = options.every ?? 5;
  const available = options.available ?? new Set(INTERSTITIAL_ORDER);
  const units: FeedUnit<TPost>[] = [];
  let interstitialIndex = 0;

  posts.forEach((post, index) => {
    units.push({ kind: "post", post });

    if ((index + 1) % every === 0) {
      for (let attempt = 0; attempt < INTERSTITIAL_ORDER.length; attempt += 1) {
        const kind = INTERSTITIAL_ORDER[(interstitialIndex + attempt) % INTERSTITIAL_ORDER.length];
        if (available.has(kind)) {
          units.push({ kind });
          interstitialIndex += attempt + 1;
          break;
        }
      }
    }
  });

  return units;
}
