import { db, parseList } from "@/lib/db";
import { toPublicAuthor, type PostDto } from "@/lib/dto";
import {
  interleave,
  rankPosts,
  type FeedUnit,
  type RankablePost,
  type RankingContext,
} from "@/lib/feed-ranking";

export type FeedTab = "per-ty" | "gjenerata" | "ndjek";

const POST_INCLUDE = {
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
      faculty: { select: { name: true, color: true } },
    },
  },
  course: {
    select: {
      id: true,
      name: true,
      code: true,
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
      rating: true,
      downloads: true,
      verificationStatus: true,
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

type RawPost = Awaited<ReturnType<typeof fetchPosts>>[number];

async function fetchPosts(where: object, take: number, cursor?: string) {
  return db.post.findMany({
    where,
    include: POST_INCLUDE,
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
}

export async function buildRankingContext(userId: string): Promise<RankingContext> {
  const [me, following, enrollments] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { facultyId: true, year: true },
    }),
    db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true, isMutual: true },
    }),
    db.enrollment.findMany({ where: { userId }, select: { courseId: true } }),
  ]);

  const followingIds = new Set(following.map((item) => item.followingId));
  const mutualIds = new Set(
    following.filter((item) => item.isMutual).map((item) => item.followingId),
  );

  const secondDegree = await db.follow.findMany({
    where: { followerId: { in: [...followingIds] } },
    select: { followingId: true },
  });
  const secondDegreeCounts = new Map<string, number>();
  for (const edge of secondDegree) {
    secondDegreeCounts.set(
      edge.followingId,
      (secondDegreeCounts.get(edge.followingId) ?? 0) + 1,
    );
  }

  return {
    viewerId: userId,
    followingIds,
    mutualIds,
    secondDegreeCounts,
    courseIds: new Set(enrollments.map((item) => item.courseId)),
    facultyId: me?.facultyId ?? null,
    year: me?.year ?? null,
  };
}

function toDto(
  post: RawPost,
  viewer: { likedIds: Set<string>; savedIds: Set<string>; pollVotes: Map<string, string>; userId: string },
): PostDto {
  const anonymous = post.isAnonymous;

  return {
    id: post.id,
    type: post.type,
    text: post.text,
    media: parseList(post.media),
    createdAt: post.createdAt.toISOString(),
    courseId: post.courseId,
    course: post.course
      ? {
          id: post.course.id,
          name: post.course.name,
          code: post.course.code,
          facultyColor: post.course.department.faculty.color,
        }
      : null,
    material: post.material
      ? {
          id: post.material.id,
          title: post.material.title,
          type: post.material.type,
          pages: post.material.pages,
          size: post.material.size,
          rating: post.material.rating,
          downloads: post.material.downloads,
          verificationStatus: post.material.verificationStatus,
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
    author: anonymous
      ? { anonymous: true, profile: { pseudonym: post.pseudonym ?? "Studenti anonim" } }
      : { anonymous: false, profile: toPublicAuthor(post.author) },
    counts: {
      likes: post.likeCount,
      comments: post.commentCount,
      saves: post.saveCount,
    },
    viewer: {
      liked: viewer.likedIds.has(post.id),
      saved: viewer.savedIds.has(post.id),
      isAuthor: post.authorId === viewer.userId,
    },
    isHidden: post.isHidden,
  };
}

export async function getFeed(
  userId: string,
  tab: FeedTab,
  cursor?: string,
): Promise<{ units: FeedUnit<PostDto>[]; nextCursor: string | null; total: number }> {
  const context = await buildRankingContext(userId);

  const blocks = await db.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const blockedIds = new Set(
    blocks.flatMap((block) => [block.blockerId, block.blockedId]).filter((id) => id !== userId),
  );

  const baseWhere = {
    isHidden: false,
    ...(blockedIds.size > 0 ? { authorId: { notIn: [...blockedIds] } } : {}),
  };

  const where =
    tab === "ndjek"
      ? { ...baseWhere, authorId: { in: [...context.followingIds] } }
      : tab === "gjenerata"
        ? {
            ...baseWhere,
            author: {
              facultyId: context.facultyId ?? undefined,
              year: context.year ?? undefined,
            },
          }
        : baseWhere;

  const take = tab === "per-ty" ? 60 : 20;
  const posts = await fetchPosts(where, take + 1, cursor);
  const hasMore = posts.length > take;
  const page = hasMore ? posts.slice(0, take) : posts;

  const [likes, saves, pollVotes] = await Promise.all([
    db.reaction.findMany({
      where: { userId, postId: { in: page.map((post) => post.id) } },
      select: { postId: true },
    }),
    db.bookmark.findMany({
      where: { userId, targetType: "post", targetId: { in: page.map((post) => post.id) } },
      select: { targetId: true },
    }),
    db.pollVote.findMany({
      where: { userId, postId: { in: page.map((post) => post.id) } },
      select: { postId: true, optionId: true },
    }),
  ]);

  const viewer = {
    userId,
    likedIds: new Set(likes.map((item) => item.postId)),
    savedIds: new Set(saves.map((item) => item.targetId)),
    pollVotes: new Map(pollVotes.map((item) => [item.postId, item.optionId])),
  };

  let ordered = page;

  if (tab === "per-ty") {
    const reportCounts = await db.report.groupBy({
      by: ["targetId"],
      where: { targetType: "post", targetId: { in: page.map((post) => post.id) } },
      _count: { targetId: true },
    });
    const reportMap = new Map(
      reportCounts.map((row) => [row.targetId, row._count.targetId]),
    );

    const rankable: (RankablePost & { raw: RawPost })[] = page.map((post) => ({
      id: post.id,
      authorId: post.authorId,
      createdAt: post.createdAt,
      courseId: post.courseId,
      facultyId: post.facultyId,
      authorFacultyId: post.author.facultyId,
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
      .slice(0, 20)
      .map((item) => item.raw);
  }

  const dtos = ordered.map((post) => toDto(post, viewer));
  const units = interleave(dtos, { every: 5 });

  return {
    units,
    nextCursor: hasMore ? page[page.length - 1].id : null,
    total: dtos.length,
  };
}

/** Njësitë jo-postuese që futen mes postimeve. */
export async function getInterstitialData(userId: string) {
  const context = await buildRankingContext(userId);
  const courseIds = [...context.courseIds];

  const [material, question, event] = await Promise.all([
    db.material.findFirst({
      where: { courseId: { in: courseIds }, isHidden: false, uploaderId: { not: userId } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        type: true,
        rating: true,
        downloads: true,
        pages: true,
        verificationStatus: true,
        course: { select: { id: true, name: true } },
        uploader: { select: { name: true, username: true, avatar: true } },
      },
    }),
    db.question.findFirst({
      where: {
        courseId: { in: courseIds },
        acceptedAnswerId: null,
        isHidden: false,
        authorId: { not: userId },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        course: { select: { id: true, name: true } },
        _count: { select: { answers: true } },
      },
    }),
    db.event.findFirst({
      where: { date: { gte: new Date() }, facultyId: context.facultyId ?? undefined },
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
          ...material,
          createdAtLabel: null,
        }
      : null,
    question: question
      ? {
          id: question.id,
          title: question.title,
          courseName: question.course.name,
          courseId: question.course.id,
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
