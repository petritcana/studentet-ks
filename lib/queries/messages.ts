import { db } from "@/lib/db";
import { parseMedia } from "@/lib/media";
import { toPublicAuthor, type PublicAuthor } from "@/lib/dto";
import { acceptedFollow } from "@/lib/follow";
import { dayHeading, dayKey } from "@/lib/format";
import { ONLINE_WINDOW_SECONDS } from "@/lib/presence";
import { isMuted } from "@/lib/chat-rules";
import { liveCall } from "@/lib/calls";
import { postScopeFilter, type AccessUser } from "@/lib/access";

export type ConversationSummary = {
  id: string;
  isAccepted: boolean;
  unread: number;
  /** Njoftimet e kësaj bisede janë të heshtura tani. */
  muted: boolean;
  lastMessage: {
    text: string;
    /** Zëri dhe skedarët pa tekst kanë etiketën e vet te lista. */
    kind: "text" | "voice" | "media" | "call" | "post";
    createdAt: string;
    mine: boolean;
    authorName: string | null;
  } | null;
  other: PublicAuthor | null;
  group: { title: string; memberCount: number; members: { name: string; avatar: string | null }[] } | null;
};

const MEMBER_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
  isVerified: true,
  year: true,
  proEarnedUntil: true,
  university: { select: { abbr: true } },
  faculty: { select: { name: true, nameEn: true, color: true } },
  subscriptions: { where: { status: "active" as const }, select: { status: true, expiresAt: true } },
} as const;

// Kërkesat mbahen veç, që të panjohurit të mos hyjnë drejt në kuti.
export async function getConversations(
  userId: string,
  locale: string,
): Promise<{ accepted: ConversationSummary[]; requests: ConversationSummary[] }> {
  const memberships = await db.conversationMember.findMany({
    where: { userId },
    orderBy: { conversation: { updatedAt: "desc" } },
    take: 60,
    select: {
      isAccepted: true,
      lastReadAt: true,
      mutedUntil: true,
      conversation: {
        select: {
          id: true,
          type: true,
          title: true,
          _count: { select: { members: true } },
          members: {
            where: { userId: { not: userId } },
            take: 3,
            select: { user: { select: MEMBER_USER_SELECT } },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              text: true,
              kind: true,
              media: true,
              createdAt: true,
              authorId: true,
              author: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  const unreadCounts = await Promise.all(
    memberships.map((membership) =>
      db.message.count({
        where: {
          conversationId: membership.conversation.id,
          authorId: { not: userId },
          createdAt: { gt: membership.lastReadAt },
        },
      }),
    ),
  );

  const summaries: ConversationSummary[] = memberships.map((membership, index) => {
    const conversation = membership.conversation;
    const last = conversation.messages[0] ?? null;
    const isGroup = conversation.type === "group";
    const other = isGroup ? null : (conversation.members[0]?.user ?? null);

    return {
      id: conversation.id,
      isAccepted: membership.isAccepted,
      unread: unreadCounts[index],
      muted: isMuted(membership.mutedUntil),
      lastMessage: last
        ? {
            // Rreshti i thirrjes mban id-në e saj si tekst: nuk shfaqet kurrë.
            text: last.kind === "call" ? "" : last.text,
            kind:
              last.kind === "voice"
                ? "voice"
                : last.kind === "call"
                  ? "call"
                  : last.kind === "post_share" && !last.text
                    ? "post"
                : !last.text && parseMedia(last.media).length > 0
                  ? "media"
                  : "text",
            createdAt: last.createdAt.toISOString(),
            mine: last.authorId === userId,
            authorName: isGroup ? last.author.name.split(" ")[0] : null,
          }
        : null,
      other: other ? toPublicAuthor(other, locale) : null,
      group: isGroup
        ? {
            title: conversation.title ?? "",
            memberCount: conversation._count.members,
            members: conversation.members.map((member) => ({ name: member.user.name, avatar: member.user.avatar })),
          }
        : null,
    };
  });

  return {
    accepted: summaries.filter((item) => item.isAccepted),
    requests: summaries.filter((item) => !item.isAccepted),
  };
}

export async function getConversation(conversationId: string, userId: string, locale: string) {
  const membership = await db.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: {
      id: true,
      isAccepted: true,
      role: true,
      mutedUntil: true,
      joinedAt: true,
      conversation: { select: { type: true, adminsOnly: true, allowLinks: true } },
    },
  });
  if (!membership) return null;

  /*
    Kush po shkruan, dhe deri ku e ka lexuar tjetri.

    Shenja e shkrimit ka afat të shkurtër te baza, prandaj lexohet bashkë me
    bisedën: e vjetruar nuk shfaqet. «E lexuar» matet nga `lastReadAt` i
    anëtarëve të tjerë, dhe respekton çelësin e privatësisë të secilit.
  */
  const participants = await db.conversationMember.findMany({
    where: { conversationId, userId: { not: userId } },
    select: {
      id: true,
      userId: true,
      role: true,
      joinedAt: true,
      lastReadAt: true,
      typingUntil: true,
      user: { select: { name: true, showReadReceipts: true, showLastActive: true, showOnlineStatus: true, lastSeenAt: true } },
    },
  });

  const now = new Date();
  const typing = participants
    .filter((member) => member.typingUntil && member.typingUntil > now)
    .map((member) => member.user.name);

  // Ora e leximit më e hershme: një mesazh quhet i lexuar kur e panë të gjithë.
  const readable = participants.filter((member) => member.user.showReadReceipts);
  const readUpTo =
    readable.length > 0
      ? readable.reduce(
          (earliest, member) => (member.lastReadAt < earliest ? member.lastReadAt : earliest),
          readable[0].lastReadAt,
        )
      : null;

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      type: true,
      title: true,
      members: {
        where: { userId: { not: userId } },
        orderBy: { joinedAt: "asc" },
        select: { role: true, user: { select: MEMBER_USER_SELECT } },
      },
      // Të 200 mesazhet e fundit, jo të parat: biseda e gjatë duhet të hapet te fundi.
      messages: {
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          text: true,
          media: true,
          kind: true,
          editedAt: true,
          deletedAt: true,
          createdAt: true,
          authorId: true,
          author: { select: { name: true, username: true, avatar: true } },
          replyTo: {
            select: { id: true, text: true, deletedAt: true, author: { select: { name: true } } },
          },
          reactions: { select: { emoji: true, userId: true } },
          story: { select: { kind: true, mediaUrl: true } },
          postId: true,
        },
      },
    },
  });
  if (!conversation) return null;

  const isGroup = conversation.type === "group";
  const others = conversation.members.map((member) => toPublicAuthor(member.user, locale));
  const ordered = [...conversation.messages].reverse();

  /*
    Grupi ka gjithmonë një admin. Grupet e vjetra, nga para roleve, e marrin
    këtu: admin bëhet kush është aty më gjatë. Ndodh një herë për grup.
  */
  let myRole = membership.role;
  const roles = new Map(participants.map((member) => [member.userId, member.role]));
  if (isGroup && myRole !== "admin" && ![...roles.values()].includes("admin")) {
    const everyone = [
      { id: membership.id, userId, joinedAt: membership.joinedAt },
      ...participants.map((member) => ({ id: member.id, userId: member.userId, joinedAt: member.joinedAt })),
    ].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime() || a.id.localeCompare(b.id));
    const first = everyone[0];
    await db.conversationMember.update({ where: { id: first.id }, data: { role: "admin" } });
    if (first.userId === userId) myRole = "admin";
    else roles.set(first.userId, "admin");
  }

  // Thirrja e gjallë dhe thirrjet e shënuara në bisedë.
  const live = await liveCall(conversationId);
  const callIds = ordered.filter((message) => message.kind === "call").map((message) => message.text);
  const calls = callIds.length
    ? await db.chatCall.findMany({
        where: { id: { in: callIds }, conversationId },
        select: { id: true, video: true, startedAt: true, endedAt: true },
      })
    : [];
  const callById = new Map(calls.map((call) => [call.id, call]));

  /*
    Postimet e ndara: karta del vetëm kur edhe shikuesi e sheh postimin në rrethin
    e vet. Përndryshe mbetet vetëm shënimi që nuk hapet për të.
  */
  const postIds = [...new Set(ordered.flatMap((message) => (message.postId ? [message.postId] : [])))];
  const sharedPosts = postIds.length ? await visiblePosts(userId, postIds) : new Map();

  /*
    Gjendja e mesazhit tim, pa zbuluar më shumë se sa lejon secili:
    - «dorëzuar»: dikush tjetër ka qenë aktiv pas tij, vetëm kur e lejon koha e fundit aktive;
    - «parë»: e ka lexuar, vetëm kur i lejon shenjat e leximit;
    - në grup, sa veta e panë.
  */
  const receipts = participants.filter((member) => member.user.showReadReceipts);
  const activity = participants.filter((member) => member.user.showLastActive);
  const onlineSince = new Date(now.getTime() - ONLINE_WINDOW_SECONDS * 1000);
  const onlineCount =
    1 + participants.filter((member) => member.user.showOnlineStatus && member.user.lastSeenAt >= onlineSince).length;

  return {
    id: conversation.id,
    isAccepted: membership.isAccepted,
    other: isGroup ? null : (others[0] ?? null),
    group: isGroup ? { title: conversation.title ?? "", members: others } : null,
    typing,
    onlineCount,
    myRole: isGroup ? myRole : "member",
    mutedUntil: membership.mutedUntil && membership.mutedUntil > now ? membership.mutedUntil.toISOString() : null,
    rules: { adminsOnly: membership.conversation.adminsOnly, allowLinks: membership.conversation.allowLinks },
    // Anëtarët me rolin, për cilësimet e grupit. Unë nuk jam në listë: kam `myRole`.
    memberRoles: isGroup
      ? conversation.members.map((member) => ({ id: member.user.id, role: roles.get(member.user.id) ?? member.role }))
      : [],
    activeCall: live
      ? {
          id: live.id,
          video: live.video,
          count: live.participants.length,
          joined: live.participants.some((participant) => participant.userId === userId),
        }
      : null,
    memberCount: participants.length + 1,
    // Dita e sotme, për mesazhet që dërgohen nga kjo skedë para se t'i kthejë serveri.
    today: { key: dayKey(now), label: dayHeading(now, locale, now) },
    messages: ordered.map((message) => {
      const counts: Record<string, number> = {};
      for (const reaction of message.reactions) {
        counts[reaction.emoji] = (counts[reaction.emoji] ?? 0) + 1;
      }

      return {
        id: message.id,
        text: message.text,
        media: parseMedia(message.media),
        kind: message.kind,
        edited: Boolean(message.editedAt),
        deleted: Boolean(message.deletedAt),
        createdAt: message.createdAt.toISOString(),
        mine: message.authorId === userId,
        // «E lexuar» ka kuptim vetëm te mesazhet e mia.
        seen:
          message.authorId === userId && readUpTo !== null && message.createdAt <= readUpTo,
        seenCount:
          message.authorId === userId ? receipts.filter((member) => member.lastReadAt >= message.createdAt).length : 0,
        delivered:
          message.authorId === userId &&
          (activity.some((member) => member.user.lastSeenAt >= message.createdAt) ||
            receipts.some((member) => member.lastReadAt >= message.createdAt)),
        day: dayKey(message.createdAt),
        dayLabel: dayHeading(message.createdAt, locale, now),
        replyTo: message.replyTo
          ? {
              id: message.replyTo.id,
              author: message.replyTo.author.name,
              text: message.replyTo.deletedAt ? "" : message.replyTo.text.slice(0, 120),
            }
          : null,
        reactions: counts,
        myReaction: message.reactions.find((item) => item.userId === userId)?.emoji ?? null,
        // Mesazhi që i përgjigjet storjes e mban storjen me vete; null kur storja u fshi.
        story: message.story ? { kind: message.story.kind, mediaUrl: message.story.mediaUrl } : null,
        call: message.kind === "call" ? callSummary(callById.get(message.text), live?.id ?? null) : null,
        post: message.postId ? (sharedPosts.get(message.postId) ?? { id: message.postId, visible: false }) : null,
        author: isGroup
          ? { name: message.author.name, username: message.author.username, avatar: message.author.avatar }
          : null,
      };
    }),
  };
}

/** Njerëzit që mund të shtohen në një grup: ata që ndjek dhe ata që e ndjekin. */
export async function getGroupCandidates(userId: string, excludeIds: string[] = []) {
  const rows = await db.follow.findMany({
    where: { ...acceptedFollow, OR: [{ followerId: userId }, { followingId: userId }] },
    take: 400,
    select: {
      followerId: true,
      follower: { select: { id: true, name: true, username: true, avatar: true } },
      following: { select: { id: true, name: true, username: true, avatar: true } },
    },
  });

  const seen = new Set([userId, ...excludeIds]);
  const people: { id: string; name: string; username: string; avatar: string | null }[] = [];
  for (const row of rows) {
    const person = row.followerId === userId ? row.following : row.follower;
    if (seen.has(person.id)) continue;
    seen.add(person.id);
    people.push(person);
  }
  return people.sort((a, b) => a.name.localeCompare(b.name));
}

/** Thirrja si rresht në bisedë: me video apo jo, e gjallë, dhe sa zgjati. */
function callSummary(
  call: { id: string; video: boolean; startedAt: Date; endedAt: Date | null } | undefined,
  liveId: string | null,
) {
  if (!call) return { id: "", video: false, live: false, minutes: null };
  const live = call.id === liveId;
  const minutes = call.endedAt ? Math.max(1, Math.round((call.endedAt.getTime() - call.startedAt.getTime()) / 60_000)) : null;
  return { id: call.id, video: call.video, live, minutes: live ? null : minutes };
}

export type SharedPostView =
  | { id: string; visible: false }
  | {
      id: string;
      visible: true;
      text: string;
      image: string | null;
      author: { name: string; username: string; avatar: string | null };
    };

/** Postimet që shikuesi i sheh, si karta të vogla për bisedën. */
async function visiblePosts(userId: string, ids: string[]) {
  const viewer = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      universityId: true,
      facultyId: true,
      proEarnedUntil: true,
      subscriptions: { where: { status: "active" }, select: { status: true, expiresAt: true } },
      enrollments: { select: { courseId: true } },
    },
  });
  const access: AccessUser | null = viewer;
  const rows = await db.post.findMany({
    where: { id: { in: ids }, isAnonymous: false, ...postScopeFilter(access) },
    select: { id: true, text: true, media: true, author: { select: { name: true, username: true, avatar: true } } },
  });
  const views = new Map<string, SharedPostView>();
  for (const row of rows) {
    const first = parseMedia(row.media).find((item) => item.kind === "image");
    views.set(row.id, {
      id: row.id,
      visible: true,
      text: row.text.slice(0, 220),
      image: first ? `/api/media/${first.id}` : null,
      author: row.author,
    });
  }
  return views;
}
