import { db, parseList } from "@/lib/db";
import { toPublicAuthor, type PostDto } from "@/lib/dto";

/** Postimet publike të një profili. Postimet anonime nuk lidhen kurrë me profilin. */
export async function getProfilePosts(
  profileId: string,
  viewerId: string,
  take = 10,
): Promise<PostDto[]> {
  const posts = await db.post.findMany({
    where: { authorId: profileId, isAnonymous: false, isHidden: false },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          isVerified: true,
          year: true,
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
        orderBy: { order: "asc" },
        select: { id: true, text: true, _count: { select: { votes: true } } },
      },
    },
  });

  const ids = posts.map((post) => post.id);
  const [likes, saves, votes] = await Promise.all([
    db.reaction.findMany({
      where: { userId: viewerId, postId: { in: ids } },
      select: { postId: true },
    }),
    db.bookmark.findMany({
      where: { userId: viewerId, targetType: "post", targetId: { in: ids } },
      select: { targetId: true },
    }),
    db.pollVote.findMany({
      where: { userId: viewerId, postId: { in: ids } },
      select: { postId: true, optionId: true },
    }),
  ]);

  const likedIds = new Set(likes.map((item) => item.postId));
  const savedIds = new Set(saves.map((item) => item.targetId));
  const voteMap = new Map(votes.map((item) => [item.postId, item.optionId]));

  return posts.map((post) => ({
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
    material: post.material,
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
            myOptionId: voteMap.get(post.id) ?? null,
            options: post.pollOptions.map((option) => ({
              id: option.id,
              text: option.text,
              votes: option._count.votes,
            })),
          }
        : null,
    author: { anonymous: false, profile: toPublicAuthor(post.author) },
    counts: {
      likes: post.likeCount,
      comments: post.commentCount,
      saves: post.saveCount,
    },
    viewer: {
      liked: likedIds.has(post.id),
      saved: savedIds.has(post.id),
      isAuthor: post.authorId === viewerId,
    },
    isHidden: post.isHidden,
  }));
}
