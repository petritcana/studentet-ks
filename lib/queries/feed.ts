import { pickIndex } from "@/lib/ads";
import { parseMedia } from "@/lib/media";
import { db } from "@/lib/db";
import { canViewMaterial, postScopeFilter, shouldSeeAds, type AccessUser } from "@/lib/access";
import { toPublicAuthor, type AdDto, type PostDto } from "@/lib/dto";
import { interleave, rankPosts, type FeedUnit, type RankablePost } from "@/lib/feed-ranking";
import { acceptedFollow } from "@/lib/follow";
import { getFollowing } from "./social-graph";

export type FeedTab =
  | "per-ty"
  | "fakulteti"
  | "ndjek"
  | "gjenerata"
  | "universiteti"
  | "global"
  | "zeri";

const BASE_INCLUDE = {
  author: {
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
      isVerified: true,
      year: true,
      createdAt: true,
      facultyId: true,
      proEarnedUntil: true,
      // Nevojitet që karta ta dijë nëse ky postim është i ngulur te profili.
      pinnedPostId: true,
      university: { select: { abbr: true } },
      faculty: { select: { name: true, nameEn: true, color: true } },
      subscriptions: { where: { status: "active" }, select: { status: true, expiresAt: true } },
    },
  },
  course: {
    select: {
      id: true,
      name: true,
      nameEn: true,
      department: { select: { faculty: { select: { color: true } } } },
    },
  },
  material: {
    select: {
      id: true,
      title: true,
      type: true,
      pages: true,
      size: true,
      mimeType: true,
      rating: true,
      downloads: true,
      verificationStatus: true,
      isHidden: true,
      uploaderId: true,
      courseId: true,
      course: {
        select: {
          department: {
            select: { facultyId: true, faculty: { select: { universityId: true, name: true, nameEn: true } } },
          },
        },
      },
    },
  },
  event: {
    select: {
      id: true,
      title: true,
      date: true,
      location: true,
      kind: true,
      _count: { select: { rsvps: true } },
    },
  },
  pollOptions: {
    orderBy: { order: "asc" as const },
    select: { id: true, text: true, _count: { select: { votes: true } } },
  },
} as const;

const POST_INCLUDE = {
  ...BASE_INCLUDE,
  repostOf: { include: BASE_INCLUDE },
} as const;

type RawPost = Awaited<ReturnType<typeof fetchPosts>>[number];
type BasePost = Omit<RawPost, "repostOf">;

type Viewer = {
  user: AccessUser;
  myReactions: Map<string, string[]>;
  reactionCounts: Map<string, Record<string, number>>;
  savedIds: Set<string>;
  repostedIds: Set<string>;
  pollVotes: Map<string, string>;
  followingIds: Set<string>;
};

/** Id-të për të cilat duhet gjendja e shikuesit: postimet dhe origjinalet e ripostuara. */
function viewerIds(rows: { id: string; repostOfId: string | null }[]) {
  return [...new Set(rows.flatMap((row) => (row.repostOfId ? [row.id, row.repostOfId] : [row.id])))];
}

async function fetchPosts(where: object, take: number, cursor?: string) {
  return db.post.findMany({
    where,
    include: POST_INCLUDE,
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
}

export async function buildRankingContext(user: AccessUser) {
  const following = (await getFollowing(user.id)).rows;

  const followingIds = new Set(following.map((item) => item.followingId));
  const mutualIds = new Set(
    following.filter((item) => item.isMutual).map((item) => item.followingId),
  );

  const secondDegree = await db.follow.findMany({
    where: { ...acceptedFollow, followerId: { in: [...followingIds] } },
    select: { followingId: true },
  });
  const secondDegreeCounts = new Map<string, number>();
  for (const edge of secondDegree) {
    secondDegreeCounts.set(edge.followingId, (secondDegreeCounts.get(edge.followingId) ?? 0) + 1);
  }

  const me = await db.user.findUnique({
    where: { id: user.id },
    select: { year: true },
  });

  return {
    viewerId: user.id,
    followingIds,
    mutualIds,
    secondDegreeCounts,
    courseIds: new Set((user.enrollments ?? []).map((item) => item.courseId)),
    facultyId: user.facultyId,
    year: me?.year ?? null,
  };
}

function toDto(post: BasePost & { repostOf?: BasePost | null }, viewer: Viewer, locale: string): PostDto {
  const english = locale === "en";

  const materialAccess = post.material
    ? canViewMaterial(viewer.user, {
        id: post.material.id,
        courseId: post.material.courseId,
        isHidden: post.material.isHidden,
        uploaderId: post.material.uploaderId,
        course: post.material.course,
      })
    : null;

  return {
    id: post.id,
    type: post.type,
    scope: post.scope,
    text: post.text,
    media: parseMedia(post.media),
    createdAt: post.createdAt.toISOString(),
    course: post.course
      ? {
          id: post.course.id,
          name: english ? post.course.nameEn : post.course.name,
          facultyCode: post.course.department.faculty.color,
        }
      : null,
    material: post.material
      ? {
          id: post.material.id,
          title: post.material.title,
          type: post.material.type,
          pages: post.material.pages,
          size: post.material.size,
          mimeType: post.material.mimeType,
          rating: post.material.rating,
          downloads: post.material.downloads,
          verificationStatus: post.material.verificationStatus,
          locked: !materialAccess?.allowed,
          facultyLabel: english
            ? post.material.course.department.faculty.nameEn
            : post.material.course.department.faculty.name,
        }
      : null,
    event: post.event
      ? {
          id: post.event.id,
          title: post.event.title,
          date: post.event.date.toISOString(),
          location: post.event.location,
          kind: post.event.kind,
          goingCount: post.event._count.rsvps,
        }
      : null,
    poll:
      post.pollOptions.length > 0
        ? {
            totalVotes: post.pollOptions.reduce((sum, option) => sum + option._count.votes, 0),
            myOptionId: viewer.pollVotes.get(post.id) ?? null,
            options: post.pollOptions.map((option) => ({
              id: option.id,
              text: option.text,
              votes: option._count.votes,
            })),
          }
        : null,
    author: post.isAnonymous
      ? { anonymous: true, pseudonym: post.pseudonym ?? "Anonim" }
      : {
          anonymous: false,
          profile: toPublicAuthor(post.author, locale),
          following:
            post.authorId === viewer.user.id || viewer.followingIds.has(post.authorId),
        },
    counts: {
      likes: post.likeCount,
      comments: post.commentCount,
      saves: post.saveCount,
      reposts: post.repostCount,
    },
    reactions: viewer.reactionCounts.get(post.id) ?? {},
    viewer: {
      reactions: viewer.myReactions.get(post.id) ?? [],
      saved: viewer.savedIds.has(post.id),
      reposted: viewer.repostedIds.has(post.id),
      isAuthor: post.authorId === viewer.user.id,
    },
    featured: Boolean(post.featuredUntil && post.featuredUntil.getTime() > Date.now()),
    pinned: post.author.pinnedPostId === post.id,
    repostOf: post.repostOf && !post.repostOf.isHidden ? toDto(post.repostOf, viewer, locale) : null,
  };
}

/** Një postim i vetëm, me të njëjtin DTO si te feed-i. */
export async function getPostById(
  user: AccessUser,
  postId: string,
  locale: string,
): Promise<PostDto | null> {
  const post = await db.post.findUnique({ where: { id: postId }, include: POST_INCLUDE });
  if (!post) return null;

  const context = await buildRankingContext(user);
  const viewer = await buildViewer(user, viewerIds([post]), context.followingIds);
  return toDto(post, viewer, locale);
}

/** Komentet e një postimi, me identitetin publik të autorit. */
export async function getComments(postId: string, locale: string, viewerId?: string) {
  const comments = await db.comment.findMany({
    where: { postId, isHidden: false },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      text: true,
      createdAt: true,
      pseudonym: true,
      parentId: true,
      authorId: true,
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          isVerified: true,
          year: true,
          proEarnedUntil: true,
          university: { select: { abbr: true } },
          faculty: { select: { name: true, nameEn: true, color: true } },
          subscriptions: { where: { status: "active" }, select: { status: true, expiresAt: true } },
        },
      },
    },
  });

  // Te një fije anonime, identiteti i vërtetë nuk del kurrë jashte serverit.
  return comments.map((comment) =>
    comment.pseudonym
      ? {
          id: comment.id,
          text: comment.text,
          createdAt: comment.createdAt.toISOString(),
          author: null,
          pseudonym: comment.pseudonym,
          parentId: comment.parentId,
          // Te fija anonime pronësia shihet vetëm nga vetë autori, për ta fshirë.
          mine: comment.authorId === viewerId,
        }
      : {
          id: comment.id,
          text: comment.text,
          createdAt: comment.createdAt.toISOString(),
          author: toPublicAuthor(comment.author, locale),
          pseudonym: null,
          parentId: comment.parentId,
          mine: comment.authorId === viewerId,
        },
  );
}

/** Gjendja e shikuesit ndaj një grupi postimesh. */
async function buildViewer(user: AccessUser, ids: string[], followingIds: Set<string>): Promise<Viewer> {
  /*
    Një udhëtim, jo pesë.

    `$transaction` me një listë pyetjesh i dërgon të gjitha bashkë, prandaj
    kushtojnë sa një pyetje e vetme edhe kur serveri rri larg bazës. Të gjitha
    janë vetëm lexim, prandaj rendi mes tyre nuk ka rëndësi.
  */
  /*
    Dy udhëtime, jo pesë.

    `$transaction` me një listë pyetjesh i dërgon të gjitha bashkë, prandaj
    kushtojnë sa një e vetme edhe kur serveri rri larg bazës. Grupimi i reagimeve
    rri veç, sepse `groupBy` nuk hyn në të njëjtin grup me tipa të ruajtur.
  */
  const [[likes, saves, pollVotes, reposts], reactionRows] = await Promise.all([
    db.$transaction([
      db.reaction.findMany({
        where: { userId: user.id, postId: { in: ids } },
        select: { postId: true, type: true },
      }),
      db.bookmark.findMany({
        where: { userId: user.id, targetType: "post", targetId: { in: ids } },
        select: { targetId: true },
      }),
      db.pollVote.findMany({
        where: { userId: user.id, postId: { in: ids } },
        select: { postId: true, optionId: true },
      }),
      db.post.findMany({
        where: { authorId: user.id, repostOfId: { in: ids } },
        select: { repostOfId: true },
      }),
    ]),
    db.reaction.groupBy({
      by: ["postId", "type"],
      where: { postId: { in: ids } },
      _count: { type: true },
    }),
  ]);

  const myReactions = new Map<string, string[]>();
  for (const row of likes) myReactions.set(row.postId, [...(myReactions.get(row.postId) ?? []), row.type]);

  const reactionCounts = new Map<string, Record<string, number>>();
  for (const row of reactionRows) {
    const current = reactionCounts.get(row.postId) ?? {};
    current[row.type] = row._count.type;
    reactionCounts.set(row.postId, current);
  }

  return {
    user,
    myReactions,
    repostedIds: new Set(reposts.map((row) => row.repostOfId).filter((id): id is string => Boolean(id))),
    reactionCounts,
    savedIds: new Set(saves.map((item) => item.targetId)),
    pollVotes: new Map(pollVotes.map((item) => [item.postId, item.optionId])),
    followingIds,
  };
}

export async function getProfilePosts(
  viewerUser: AccessUser,
  authorId: string,
  locale: string,
  options: { take?: number; cursor?: string; kind?: string } = {},
): Promise<{ posts: PostDto[]; nextCursor: string | null }> {
  const take = options.take ?? 12;
  const context = await buildRankingContext(viewerUser);

  // «original» janë postimet e veta, «reposts» ripostimet: profili i tregon në skeda të ndara.
  const typeFilter =
    options.kind && options.kind !== "all"
      ? options.kind === "media"
        ? { NOT: { media: "[]" } }
        : options.kind === "original"
          ? { repostOfId: null }
          : options.kind === "reposts"
            ? { repostOfId: { not: null } }
            : { type: options.kind }
      : {};

  const rows = await fetchPosts(
    {
      ...postScopeFilter(viewerUser),
      authorId,
      isAnonymous: false,
      ...typeFilter,
    },
    take + 1,
    options.cursor,
  );

  const page = rows.slice(0, take);
  const viewer = await buildViewer(viewerUser, viewerIds(page), context.followingIds);
  const posts = page.map((post) => toDto(post, viewer, locale));

  /*
    Postimi i ngulur del i pari, dhe vetëm te faqja e parë.

    Te faqet pasuese do të dilte sërish dhe do të dukej si i dyfishuar. Renditja
    tjetër mbetet kronologjike: ngulja është një përjashtim i vetëm, jo renditje
    e re.
  */
  if (!options.cursor) {
    const pinnedIndex = posts.findIndex((post) => post.pinned);
    if (pinnedIndex > 0) {
      const [pinned] = posts.splice(pinnedIndex, 1);
      posts.unshift(pinned);
    }
  }

  return {
    posts,
    nextCursor: rows.length > take ? page[page.length - 1]?.id ?? null : null,
  };
}

/**
 * Postimet me një hashtag, nga më i riu, vetëm brenda rrethit të shikuesit.
 * Kërkohet teksti «#fjala» si u shkrua dhe me germa të vogla, që `#Provimi` dhe
 * `#provimi` të jenë e njëjta temë.
 */
export async function getHashtagPosts(
  viewerUser: AccessUser,
  tag: string,
  locale: string,
  take = 30,
): Promise<PostDto[]> {
  const variants = [...new Set([tag, tag.toLowerCase(), tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase()])];
  const context = await buildRankingContext(viewerUser);
  const rows = await fetchPosts(
    // AND, jo OR krah për krah: filtri i rrethit ka OR-in e vet dhe nuk duhet mbuluar.
    {
      AND: [postScopeFilter(viewerUser), { OR: variants.map((variant) => ({ text: { contains: `#${variant}` } })) }],
      isAnonymous: false,
      isHidden: false,
    },
    take,
  );
  const viewer = await buildViewer(viewerUser, viewerIds(rows), context.followingIds);
  return rows.map((row) => toDto(row, viewer, locale));
}

/** Postime sipas id-ve, në rendin e dhënë. Për Të ruajtura. */
export async function getPostsByIds(
  viewerUser: AccessUser,
  ids: string[],
  locale: string,
): Promise<PostDto[]> {
  if (ids.length === 0) return [];

  const context = await buildRankingContext(viewerUser);
  const rows = await fetchPosts(
    { ...postScopeFilter(viewerUser), id: { in: ids }, isHidden: false },
    ids.length,
  );
  const viewer = await buildViewer(viewerUser, viewerIds(rows), context.followingIds);

  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids
    .map((id) => byId.get(id))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .map((row) => toDto(row, viewer, locale));
}

export async function getFeed(
  user: AccessUser,
  tab: FeedTab,
  locale: string,
): Promise<{ units: FeedUnit<PostDto>[]; total: number }> {
  const context = await buildRankingContext(user);

  const blocks = await db.userBlock.findMany({
    where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] },
    select: { blockerId: true, blockedId: true },
  });
  const blockedIds = new Set(
    blocks.flatMap((block) => [block.blockerId, block.blockedId]).filter((id) => id !== user.id),
  );

  const scopeFilter = postScopeFilter(user);
  const base = {
    ...scopeFilter,
    ...(blockedIds.size > 0 ? { authorId: { notIn: [...blockedIds] } } : {}),
  };

  // Një hartë në vend të një zinxhiri ternar: shtimi i një tab-i të ri nuk duhet
  // të kërkojë rirenditjen e gjashtë degëve.
  const scopes: Record<FeedTab, object> = {
    "per-ty": { ...base, isAnonymous: false },
    fakulteti: { ...base, isAnonymous: false, facultyId: user.facultyId ?? undefined },
    ndjek: { ...base, authorId: { in: [...context.followingIds] }, isAnonymous: false },
    gjenerata: {
      ...base,
      isAnonymous: false,
      author: { facultyId: user.facultyId ?? undefined, year: context.year ?? undefined },
    },
    universiteti: { ...base, isAnonymous: false, universityId: user.universityId ?? undefined },
    /*
      Skeda publike tregon pikërisht postimet publike.

      Dikur ishte «gjithçka që sheh dot», që për një student pa Pro ishte thuajse
      e njëjta gjë me fakultetin e tij. Tani është zbulimi: postimet e shkruara
      për tërë Kosovën, nga cilido universitet. Shkrimi aty mbetet me Pro,
      leximi jo: një postim publik që nuk lexohet dot nga të gjithë nuk është
      publik fare.
    */
    global: { isHidden: false, isAnonymous: false, scope: "national" },
    // Zëri i kampusit nuk e trashëgon `base`: rri vetëm në dhomën e vet.
    zeri: { isHidden: false, isAnonymous: true, facultyId: user.facultyId ?? undefined },
  };

  const where = scopes[tab] ?? scopes["per-ty"];

  const take = tab === "per-ty" ? 60 : 25;
  const posts = await fetchPosts(where, take);
  const ids = posts.map((post) => post.id);
  const viewer = await buildViewer(user, viewerIds(posts), context.followingIds);

  let ordered = posts;

  if (tab === "per-ty") {
    const reportCounts = await db.report.groupBy({
      by: ["targetId"],
      where: { targetType: "post", targetId: { in: ids } },
      _count: { targetId: true },
    });
    const reportMap = new Map(reportCounts.map((row) => [row.targetId, row._count.targetId]));

    const rankable: (RankablePost & { raw: RawPost })[] = posts.map((post) => ({
      id: post.id,
      authorId: post.authorId,
      createdAt: post.createdAt,
      courseId: post.courseId,
      facultyId: post.facultyId,
      authorYear: post.author.year,
      authorIsVerified: post.author.isVerified,
      authorCreatedAt: post.author.createdAt,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      saveCount: post.saveCount,
      reportCount: reportMap.get(post.id) ?? 0,
      type: post.type,
      raw: post,
    }));

    ordered = rankPosts(rankable, context)
      .slice(0, 22)
      .map((item) => item.raw);
  }

  const dtos = ordered.map((post) => toDto(post, viewer, locale));

  return {
    units: interleave(dtos, { every: 5, adEvery: 12, showAds: shouldSeeAds(user) }),
    total: dtos.length,
  };
}

/** Njësitë jo-postuese që futen mes postimeve. */
export async function getInterstitialData(user: AccessUser, locale: string) {
  const english = locale === "en";
  const courseIds = (user.enrollments ?? []).map((item) => item.courseId);

  const [material, question, event] = await db.$transaction([
    db.material.findFirst({
      where: { courseId: { in: courseIds }, isHidden: false, uploaderId: { not: user.id } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        type: true,
        rating: true,
        downloads: true,
        pages: true,
        course: { select: { id: true, name: true, nameEn: true } },
        uploader: { select: { name: true, avatar: true } },
      },
    }),
    db.question.findFirst({
      where: {
        courseId: { in: courseIds },
        acceptedAnswerId: null,
        isHidden: false,
        authorId: { not: user.id },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        course: { select: { id: true, name: true, nameEn: true } },
        _count: { select: { answers: true } },
      },
    }),
    db.event.findFirst({
      where: { date: { gte: new Date() }, facultyId: user.facultyId ?? undefined },
      orderBy: { date: "asc" },
      select: {
        id: true,
        title: true,
        date: true,
        location: true,
        kind: true,
        _count: { select: { rsvps: true } },
      },
    }),
  ]);

  return {
    material: material
      ? {
          id: material.id,
          title: material.title,
          type: material.type,
          rating: material.rating,
          downloads: material.downloads,
          pages: material.pages,
          courseName: english ? material.course.nameEn : material.course.name,
          uploader: material.uploader,
        }
      : null,
    question: question
      ? {
          id: question.id,
          title: question.title,
          courseName: english ? question.course.nameEn : question.course.name,
          answerCount: question._count.answers,
          createdAt: question.createdAt.toISOString(),
        }
      : null,
    event: event
      ? {
          id: event.id,
          title: event.title,
          date: event.date.toISOString(),
          location: event.location,
          kind: event.kind,
          goingCount: event._count.rsvps,
        }
      : null,
  };
}

/**
 * Zgjedh një reklamë sipas targetimit dhe prioritetit, dhe e regjistron shfaqjen.
 * Kurrë nuk thirret për përdorues Pro: `shouldSeeAds` vendos më lart.
 */
export async function pickAd(user: AccessUser, locale: string): Promise<AdDto | null> {
  const now = new Date();
  const ads = await db.ad.findMany({
    where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    orderBy: { priority: "desc" },
    take: 10,
    select: {
      id: true,
      title: true,
      titleEn: true,
      body: true,
      bodyEn: true,
      image: true,
      url: true,
      cta: true,
      ctaEn: true,
      advertiser: { select: { name: true } },
    },
  });
  if (ads.length === 0) return null;

  const ad = ads[pickIndex(ads.length, { userId: user.id, placement: "feed" })];
  const english = locale === "en";

  await db.adImpression.create({
    data: { adId: ad.id, userId: user.id, placement: "feed" },
  });

  return {
    id: ad.id,
    title: english ? ad.titleEn : ad.title,
    body: english ? ad.bodyEn : ad.body,
    image: ad.image,
    url: ad.url,
    cta: english ? ad.ctaEn : ad.cta,
    advertiser: ad.advertiser.name,
  };
}
