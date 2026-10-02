import { db } from "@/lib/db";
import type { StoryAuthor } from "@/components/feed/story-bar";
import { acceptedFollow } from "@/lib/follow";
import { getFollowing } from "./social-graph";

export type StoryItem = {
  id: string;
  kind: string;
  mediaUrl: string;
  caption: string | null;
  createdAt: string;
  seen: boolean;
};

export type StoryGroup = Omit<StoryAuthor, "items"> & { items: StoryItem[] };

/**
 * Rafti i stories.
 *
 * Rregulli është i thjeshtë dhe i vetëm: sheh stories e atyre që ndjek, plus të
 * tuat. Fakulteti dhe viti nuk hapin asgjë këtu; një profil publik i hap stories
 * vetëm kur dikush shkon te profili (`getAuthorStories`).
 */
export async function getStories(user: { id: string }): Promise<StoryGroup[]> {
  const now = new Date();

  const followingIds = (await getFollowing(user.id)).ids;

  const muted = await db.userBlock.findMany({
    where: { blockerId: user.id },
    select: { blockedId: true },
  });
  const hidden = new Set(muted.map((row) => row.blockedId));

  const stories = await db.story.findMany({
    where: {
      expiresAt: { gt: now },
      authorId: { in: [...followingIds, user.id].filter((id) => !hidden.has(id)) },
    },
    orderBy: { createdAt: "asc" },
    take: 120,
    select: {
      id: true,
      kind: true,
      mediaUrl: true,
      caption: true,
      createdAt: true,
      authorId: true,
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          faculty: { select: { color: true } },
        },
      },
      views: { where: { userId: user.id }, select: { id: true } },
    },
  });

  // Grupimi sipas autorit: një rreth për person, jo për storje.
  const groups = new Map<string, StoryGroup>();

  for (const story of stories) {
    const existing = groups.get(story.authorId);
    const item: StoryItem = {
      id: story.id,
      kind: story.kind,
      mediaUrl: story.mediaUrl,
      caption: story.caption,
      createdAt: story.createdAt.toISOString(),
      seen: story.views.length > 0,
    };

    if (existing) {
      existing.items.push(item);
      existing.count += 1;
      existing.seen = existing.seen && item.seen;
      continue;
    }

    groups.set(story.authorId, {
      id: story.author.id,
      name: story.author.name,
      username: story.author.username,
      avatar: story.author.avatar,
      facultyCode: story.author.faculty?.color ?? null,
      seen: item.seen,
      count: 1,
      items: [item],
    });
  }

  // Te pashikuarat te parat, pastaj me te rejat.
  return [...groups.values()].sort((a, b) => {
    if (a.seen !== b.seen) return Number(a.seen) - Number(b.seen);
    const lastA = a.items[a.items.length - 1]?.createdAt ?? "";
    const lastB = b.items[b.items.length - 1]?.createdAt ?? "";
    return lastB.localeCompare(lastA);
  });
}

/**
 * A ka ky person një story aktiv tani.
 *
 * Përdoret nga profili për unazën rreth avatarit. Kthen vetëm po ose jo: profili
 * nuk ka nevojë për përmbajtjen, dhe marrja e saj për çdo vizitë do të ishte punë
 * e kotë kur shumica nuk e klikojnë.
 */
export async function hasActiveStory(userId: string): Promise<boolean> {
  const count = await db.story.count({
    where: { authorId: userId, expiresAt: { gt: new Date() } },
  });
  return count > 0;
}

/**
 * Stories e një personi, të parë nga profili i tij.
 *
 * I hap vetëm kur shikuesi ka të drejtë ta shohë përmbajtjen e profilit: vetja,
 * ndjekësi i pranuar, ose kushdo kur profili është publik.
 */
export async function getAuthorStories(viewerId: string, authorId: string): Promise<StoryGroup[]> {
  const author = await db.user.findUnique({
    where: { id: authorId },
    select: { id: true, name: true, username: true, avatar: true, isPrivate: true, faculty: { select: { color: true } } },
  });
  if (!author) return [];

  if (viewerId !== authorId) {
    const [follows, blocked] = await Promise.all([
      db.follow.findFirst({
        where: { followerId: viewerId, followingId: authorId, ...acceptedFollow },
        select: { id: true },
      }),
      db.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: authorId, blockedId: viewerId },
            { blockerId: viewerId, blockedId: authorId },
          ],
        },
        select: { id: true },
      }),
    ]);
    if (blocked) return [];
    if (author.isPrivate && !follows) return [];
  }

  const stories = await db.story.findMany({
    where: { authorId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: {
      id: true,
      kind: true,
      mediaUrl: true,
      caption: true,
      createdAt: true,
      views: { where: { userId: viewerId }, select: { id: true } },
    },
  });
  if (stories.length === 0) return [];

  const items: StoryItem[] = stories.map((story) => ({
    id: story.id,
    kind: story.kind,
    mediaUrl: story.mediaUrl,
    caption: story.caption,
    createdAt: story.createdAt.toISOString(),
    seen: story.views.length > 0,
  }));

  return [
    {
      id: author.id,
      name: author.name,
      username: author.username,
      avatar: author.avatar,
      facultyCode: author.faculty?.color ?? null,
      seen: items.every((item) => item.seen),
      count: items.length,
      items,
    },
  ];
}
