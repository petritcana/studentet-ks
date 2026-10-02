import { db } from "@/lib/db";
import { acceptedFollow } from "@/lib/follow";

/**
 * Analitika e postimeve, për përdoruesit Pro.
 *
 * Çdo numër këtu vjen nga një rresht i vërtetë në bazë: pamjet nga `PostView`,
 * pëlqimet nga reagimet, komentet, ruajtjet dhe ripostimet nga numëruesit e tyre.
 * Asgjë nuk vlerësohet dhe asgjë nuk shpiket. Kur një numër nuk dihet, nuk
 * shfaqet fare, sepse një numër i trilluar e bën tërë panelin të pabesueshëm.
 *
 * «Shtrirja» është sa veta kishin mundësi ta shihnin postimin sipas shtrirjes së
 * tij, jo një parashikim: ndjekësit për postimet e ndjekësve, fakulteti për ato
 * të fakultetit, e kështu me radhë.
 */
export type PostAnalytics = {
  id: string;
  text: string;
  scope: string;
  createdAt: string;
  featuredUntil: string | null;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  reposts: number;
  /** Sa veta mund ta shihnin, sipas shtrirjes së zgjedhur. */
  reach: number;
};

export type AnalyticsSummary = {
  posts: PostAnalytics[];
  totals: { views: number; likes: number; comments: number; saves: number; reposts: number };
};

/** Sa veta e kanë brenda rrethit një postim me këtë shtrirje. */
async function reachFor(author: {
  id: string;
  universityId: string | null;
  facultyId: string | null;
}, scope: string): Promise<number> {
  if (scope === "national") {
    return db.user.count({ where: { onboardedAt: { not: null }, role: "student" } });
  }

  if (scope === "university" && author.universityId) {
    return db.user.count({
      where: { universityId: author.universityId, onboardedAt: { not: null } },
    });
  }

  if ((scope === "faculty" || scope === "generation" || scope === "course") && author.facultyId) {
    return db.user.count({ where: { facultyId: author.facultyId, onboardedAt: { not: null } } });
  }

  return db.follow.count({ where: { followingId: author.id, ...acceptedFollow } });
}

export async function getPostAnalytics(
  author: { id: string; universityId: string | null; facultyId: string | null },
  take = 20,
): Promise<AnalyticsSummary> {
  const posts = await db.post.findMany({
    where: { authorId: author.id, isHidden: false, isAnonymous: false },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      text: true,
      scope: true,
      createdAt: true,
      featuredUntil: true,
      viewCount: true,
      likeCount: true,
      commentCount: true,
      saveCount: true,
      repostCount: true,
    },
  });

  // Shtrirjet përsëriten, prandaj numërohen një herë për secilën.
  const scopes = [...new Set(posts.map((post) => post.scope))];
  const reachByScope = new Map<string, number>();
  for (const scope of scopes) reachByScope.set(scope, await reachFor(author, scope));

  const shaped = posts.map((post) => ({
    id: post.id,
    text: post.text,
    scope: post.scope,
    createdAt: post.createdAt.toISOString(),
    featuredUntil: post.featuredUntil?.toISOString() ?? null,
    views: post.viewCount,
    likes: post.likeCount,
    comments: post.commentCount,
    saves: post.saveCount,
    reposts: post.repostCount,
    reach: reachByScope.get(post.scope) ?? 0,
  }));

  return {
    posts: shaped,
    totals: {
      views: shaped.reduce((sum, post) => sum + post.views, 0),
      likes: shaped.reduce((sum, post) => sum + post.likes, 0),
      comments: shaped.reduce((sum, post) => sum + post.comments, 0),
      saves: shaped.reduce((sum, post) => sum + post.saves, 0),
      reposts: shaped.reduce((sum, post) => sum + post.reposts, 0),
    },
  };
}
