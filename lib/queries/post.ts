import { db, parseList } from "@/lib/db";
import { toPublicAuthor, type PostDto } from "@/lib/dto";

export async function getPostWithComments(postId: string, viewerId: string) {
  const post = await db.post.findUnique({
    where: { id: postId },
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
      comments: {
        where: { isHidden: false },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          text: true,
          createdAt: true,
          author: {
            select: { name: true, username: true, avatar: true, isVerified: true },
          },
        },
      },
    },
  });

  if (!post || post.isHidden) return null;

  const [liked, saved, pollVote] = await Promise.all([
    db.reaction.findUnique({
      where: { userId_postId: { userId: viewerId, postId } },
      select: { id: true },
    }),
    db.bookmark.findUnique({
      where: {
        userId_targetId_targetType: {
          userId: viewerId,
          targetId: postId,
          targetType: "post",
        },
      },
      select: { id: true },
    }),
    db.pollVote.findUnique({
      where: { userId_postId: { userId: viewerId, postId } },
      select: { optionId: true },
    }),
  ]);

  const dto: PostDto = {
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
            myOptionId: pollVote?.optionId ?? null,
            options: post.pollOptions.map((option) => ({
              id: option.id,
              text: option.text,
              votes: option._count.votes,
            })),
          }
        : null,
    author: post.isAnonymous
      ? { anonymous: true, profile: { pseudonym: post.pseudonym ?? "Studenti anonim" } }
      : { anonymous: false, profile: toPublicAuthor(post.author) },
    counts: {
      likes: post.likeCount,
      comments: post.comments.length,
      saves: post.saveCount,
    },
    viewer: {
      liked: Boolean(liked),
      saved: Boolean(saved),
      isAuthor: post.authorId === viewerId,
    },
    isHidden: post.isHidden,
  };

  return {
    post: dto,
    comments: post.comments.map((comment) => ({
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt.toISOString(),
      author: comment.author,
    })),
  };
}
