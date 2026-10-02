"use server";

import { revalidatePath } from "next/cache";
import { audienceSelect, canMessage } from "@/lib/audience";
import type { MediaRef } from "@/lib/media";
import { db } from "@/lib/db";
import { requireUser, requireParticipant } from "@/lib/session";
import { screen } from "@/lib/moderation";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_GROUP_CHAT_MEMBERS } from "@/lib/constants";
import { fail, succeed, type ActionState } from "./types";
import { acceptedFollow } from "@/lib/follow";
import { STORY_REACTIONS } from "@/lib/story-reactions";
import { resolveAttachments } from "@/lib/attachments";
import { containsLink } from "@/lib/chat-rules";
import { postScopeFilter } from "@/lib/access";

/**
 * Mesazhet direkte.
 *
 * Nuk kyçen kurrë pas Pro-s. Kufizimi i vetëm është social: kush nuk të ndjek
 * dhe nuk ka lëndë të përbashkët me ty, hyn në një kërkesë mesazhi, jo drejt në
 * kutinë tënde.
 */
async function canOpenDirect(meId: string, targetId: string) {
  const [mutual, sharedCourse] = await Promise.all([
    db.follow.findFirst({
      where: { followerId: meId, followingId: targetId, isMutual: true, ...acceptedFollow },
      select: { id: true },
    }),
    db.enrollment.findFirst({
      where: {
        userId: meId,
        course: { enrollments: { some: { userId: targetId } } },
      },
      select: { id: true },
    }),
  ]);

  return Boolean(mutual || sharedCourse);
}

export type MessageCandidate = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  isVerified: boolean;
  context: string | null;
};

/** Variantet e shkrimit: Postgres e krahason tekstin me germa të mëdha e të vogla. */
function spellings(query: string) {
  const lower = query.toLocaleLowerCase("sq");
  const title = lower.replace(/(^|[\s.])(\p{L})/gu, (_, gap: string, letter: string) => gap + letter.toLocaleUpperCase("sq"));
  return [...new Set([query, lower, title])];
}

/**
 * Njerëzit për «Bisedë e re» te mesazhet.
 *
 * Pa kërkim: shokët dhe ata që ndjek, që biseda e parë të jetë një prekje larg.
 * Me kërkim: kushdo në platformë me atë emër, mbiemër ose emër përdoruesi, përveç
 * atyre që janë bllokuar në njërin drejtim. Nëse personi i pranon mesazhet
 * vendoset te `startConversation`, jo këtu.
 */
export async function findPeopleToMessage(raw: string): Promise<MessageCandidate[]> {
  const me = await requireUser();
  const query = raw.trim().replace(/^@/, "").slice(0, 60);

  const blocks = await db.userBlock.findMany({
    where: { OR: [{ blockerId: me.id }, { blockedId: me.id }] },
    select: { blockerId: true, blockedId: true },
  });
  const hidden = new Set([me.id, ...blocks.flatMap((row) => [row.blockerId, row.blockedId])]);

  const select = {
    id: true,
    name: true,
    username: true,
    avatar: true,
    isVerified: true,
    university: { select: { abbr: true } },
    faculty: { select: { name: true } },
  } as const;

  type Row = { id: string; name: string; username: string; avatar: string | null; isVerified: boolean; university: { abbr: string } | null; faculty: { name: string } | null };
  let rows: Row[];

  if (query.length < 2) {
    const follows = await db.follow.findMany({
      where: { ...acceptedFollow, OR: [{ followerId: me.id }, { followingId: me.id }] },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { followerId: true, follower: { select }, following: { select } },
    });
    const seen = new Set<string>();
    rows = [];
    for (const follow of follows) {
      const person = follow.followerId === me.id ? follow.following : follow.follower;
      if (hidden.has(person.id) || seen.has(person.id)) continue;
      seen.add(person.id);
      rows.push(person);
      if (rows.length >= 12) break;
    }
  } else {
    const or = spellings(query).flatMap((text) => [
      { name: { contains: text } },
      { username: { contains: text.toLowerCase() } },
      { firstName: { contains: text } },
      { lastName: { contains: text } },
    ]);
    rows = await db.user.findMany({
      where: { OR: or, NOT: { id: { in: [...hidden] } } },
      orderBy: [{ isVerified: "desc" }, { name: "asc" }],
      take: 12,
      select,
    });
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    username: row.username,
    avatar: row.avatar,
    isVerified: row.isVerified,
    context: [row.university?.abbr, row.faculty?.name].filter(Boolean).join(" · ") || null,
  }));
}

export async function startConversation(
  targetId: string,
): Promise<ActionState & { conversationId?: string }> {
  const me = await requireParticipant();
  if (me.id === targetId) return fail("social.errorSelf");

  const blocked = await db.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: targetId, blockedId: me.id },
        { blockerId: me.id, blockedId: targetId },
      ],
    },
    select: { id: true },
  });
  if (blocked) return fail("social.errorBlocked");

  const target = await db.user.findUnique({ where: { id: targetId }, select: audienceSelect() });
  if (!target) return fail("errors.notFoundContent");

  const allowed = await canMessage(
    { id: me.id, verification: me.verification, universityId: me.universityId },
    target,
  );
  if (!allowed) return fail("social.errorMessageClosed");

  const existing = await db.conversation.findFirst({
    where: {
      type: "direct",
      AND: [{ members: { some: { userId: me.id } } }, { members: { some: { userId: targetId } } }],
    },
    select: { id: true },
  });
  if (existing) return { ...succeed(), conversationId: existing.id };

  const accepted = await canOpenDirect(me.id, targetId);
  const conversation = await db.conversation.create({ data: { type: "direct" } });

  await db.conversationMember.createMany({
    data: [
      { conversationId: conversation.id, userId: me.id, isAccepted: true },
      { conversationId: conversation.id, userId: targetId, isAccepted: accepted },
    ],
  });

  revalidatePath("/mesazhe");
  return { ...succeed(), conversationId: conversation.id };
}

export async function sendMessage(
  conversationId: string,
  text: string,
  options: { media?: MediaRef[]; replyToId?: string | null; kind?: "text" | "voice" } = {},
): Promise<ActionState> {
  const me = await requireParticipant();
  // Nga shfletuesi vjen vetëm tekst ose zë. Lidhja me storjen shkon vetëm përmes `replyToStory`.
  return deliver(me, conversationId, text, { ...options, kind: options.kind === "voice" ? "voice" : "text" });
}

type Sender = Awaited<ReturnType<typeof requireUser>>;

/** Dërgimi vetë. Nuk eksportohet: çdo thirrje e kontrollon më parë kush dërgon dhe çfarë. */
async function deliver(
  me: Sender,
  conversationId: string,
  text: string,
  options: {
    media?: MediaRef[];
    replyToId?: string | null;
    kind?: "text" | "voice" | "story_reply" | "story_reaction" | "post_share";
    storyId?: string | null;
    postId?: string | null;
  } = {},
): Promise<ActionState> {
  const limit = rateLimit("message", me.id);
  if (!limit.ok) return fail("errors.rateLimited");

  const trimmed = text.trim();
  // Bashkëngjitjet rindërtohen nga baza: vetëm skedarët që i ngarkoi vetë dërguesi.
  const media = await resolveAttachments(me.id, options.media ?? [], 4);

  // Një mesazh është ose tekst, ose skedar, ose të dyja. Bosh nuk dërgohet.
  // Postimi i ndarë mund të shkojë pa shënim; çdo mesazh tjetër ka tekst ose skedar.
  if (trimmed.length === 0 && media.length === 0 && !options.postId) return fail("errors.generic");
  if (trimmed.length > 2000) return fail("errors.generic");

  const membership = await db.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: me.id } },
    select: { id: true, role: true, conversation: { select: { type: true, adminsOnly: true, allowLinks: true } } },
  });
  if (!membership) return fail("errors.forbidden");

  // Rregullat e grupit vlejnë për anëtarët; admini i vendos, prandaj nuk e ndalin atë.
  const group = membership.conversation;
  if (group.type === "group" && membership.role !== "admin") {
    if (group.adminsOnly) return fail("errors.chatAdminsOnly");
    if (!group.allowLinks && containsLink(trimmed)) return fail("errors.chatNoLinks");
  }

  if (trimmed.length > 0) {
    const verdict = await screen(trimmed);
    if (!verdict.allowed) return fail(`guard.${verdict.category}`);
  }

  // Përgjigja duhet t'i takojë kësaj bisede, që një id e huaj të mos hyjë këtu.
  let replyToId: string | null = null;
  if (options.replyToId) {
    const original = await db.message.findFirst({
      where: { id: options.replyToId, conversationId },
      select: { id: true },
    });
    replyToId = original?.id ?? null;
  }

  await db.message.create({
    data: {
      conversationId,
      authorId: me.id,
      text: trimmed,
      media: JSON.stringify(media),
      kind: options.kind ?? "text",
      replyToId,
      storyId: options.storyId ?? null,
      postId: options.postId ?? null,
    },
  });

  // Shkrimi mbaroi: shenja «po shkruan» hiqet menjëherë.
  await db.conversationMember.updateMany({
    where: { conversationId, userId: me.id },
    data: { typingUntil: null },
  });
  await db.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  // Kush e ka heshtur bisedën nuk merr njoftim; mesazhi i pret te lista.
  const others = await db.conversationMember.findMany({
    where: {
      conversationId,
      userId: { not: me.id },
      OR: [{ mutedUntil: null }, { mutedUntil: { lt: new Date() } }],
    },
    select: { userId: true },
  });

  for (const other of others) {
    await db.notification.create({
      data: {
        userId: other.userId,
        category: "social",
        type: "message",
        actorId: me.id,
        targetId: conversationId,
        targetType: "conversation",
        groupKey: `message:${conversationId}`,
        payload: JSON.stringify({}),
      },
    });
  }

  revalidatePath(`/mesazhe/${conversationId}`);
  revalidatePath("/mesazhe");
  return succeed();
}

export async function acceptConversation(conversationId: string): Promise<ActionState> {
  const me = await requireParticipant();
  await db.conversationMember.updateMany({
    where: { conversationId, userId: me.id },
    data: { isAccepted: true },
  });
  revalidatePath("/mesazhe");
  return succeed();
}

export async function markConversationRead(conversationId: string): Promise<ActionState> {
  const me = await requireUser();
  await db.conversationMember.updateMany({
    where: { conversationId, userId: me.id },
    data: { lastReadAt: new Date() },
  });
  return succeed();
}

// Kush nuk ka bllokuar dhe nuk është bllokuar nga ky përdorues.
async function withoutBlocks(meId: string, ids: string[]) {
  const blocks = await db.userBlock.findMany({
    where: {
      OR: [
        { blockerId: meId, blockedId: { in: ids } },
        { blockedId: meId, blockerId: { in: ids } },
      ],
    },
    select: { blockerId: true, blockedId: true },
  });
  const blocked = new Set(blocks.flatMap((row) => [row.blockerId, row.blockedId]));
  return ids.filter((id) => !blocked.has(id));
}

export async function createGroupChat(
  title: string,
  memberIds: string[],
): Promise<ActionState & { conversationId?: string }> {
  const me = await requireParticipant();

  const limit = rateLimit("message", me.id);
  if (!limit.ok) return fail("errors.rateLimited");

  const name = title.trim();
  if (name.length < 2 || name.length > 60) return fail("messages.groupNameInvalid");

  const unique = [...new Set(memberIds)].filter((id) => id !== me.id);
  if (unique.length < 2) return fail("messages.groupTooSmall");
  if (unique.length + 1 > MAX_GROUP_CHAT_MEMBERS) return fail("messages.groupTooLarge");

  const existing = await db.user.findMany({ where: { id: { in: unique } }, select: { id: true } });
  const allowed = await withoutBlocks(me.id, existing.map((row) => row.id));
  if (allowed.length < 2) return fail("messages.groupTooSmall");

  const conversation = await db.conversation.create({
    data: { type: "group", title: name },
    select: { id: true },
  });

  const acceptance = await Promise.all(allowed.map((id) => canOpenDirect(me.id, id)));
  await db.conversationMember.createMany({
    data: [
      // Kush e krijon grupin është admini i tij.
      { conversationId: conversation.id, userId: me.id, isAccepted: true, role: "admin" },
      ...allowed.map((userId, index) => ({ conversationId: conversation.id, userId, isAccepted: acceptance[index] })),
    ],
  });

  revalidatePath("/mesazhe");
  return { ...succeed(), conversationId: conversation.id };
}

export async function addGroupMembers(conversationId: string, memberIds: string[]): Promise<ActionState> {
  const me = await requireParticipant();

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { type: true, members: { select: { userId: true } } },
  });
  if (!conversation || conversation.type !== "group") return fail("errors.notFoundContent");
  if (!conversation.members.some((member) => member.userId === me.id)) return fail("errors.forbidden");

  const current = new Set(conversation.members.map((member) => member.userId));
  const fresh = [...new Set(memberIds)].filter((id) => !current.has(id));
  if (fresh.length === 0) return succeed();
  if (current.size + fresh.length > MAX_GROUP_CHAT_MEMBERS) return fail("messages.groupTooLarge");

  const existing = await db.user.findMany({ where: { id: { in: fresh } }, select: { id: true, name: true } });
  const allowed = await withoutBlocks(me.id, existing.map((row) => row.id));
  const acceptance = await Promise.all(allowed.map((id) => canOpenDirect(me.id, id)));

  await db.conversationMember.createMany({
    data: allowed.map((userId, index) => ({ conversationId, userId, isAccepted: acceptance[index] })),
  });

  revalidatePath(`/mesazhe/${conversationId}`);
  revalidatePath("/mesazhe");
  return succeed();
}

export async function leaveGroupChat(conversationId: string): Promise<ActionState> {
  const me = await requireUser();

  const conversation = await db.conversation.findUnique({ where: { id: conversationId }, select: { type: true } });
  if (!conversation || conversation.type !== "group") return fail("errors.notFoundContent");

  await db.conversationMember.deleteMany({ where: { conversationId, userId: me.id } });

  const left = await db.conversationMember.count({ where: { conversationId } });
  if (left === 0) {
    await db.conversation.delete({ where: { id: conversationId } });
  } else if ((await db.conversationMember.count({ where: { conversationId, role: "admin" } })) === 0) {
    // Admini i fundit doli: grupi i kalon atij që është aty më gjatë.
    const oldest = await db.conversationMember.findFirst({
      where: { conversationId },
      orderBy: { joinedAt: "asc" },
      select: { id: true },
    });
    if (oldest) await db.conversationMember.update({ where: { id: oldest.id }, data: { role: "admin" } });
  }

  revalidatePath("/mesazhe");
  return succeed();
}


/**
 * Shenja «po shkruan».
 *
 * Nuk ka lidhje të gjallë mes shfletuesve, prandaj shenja rri te baza me një
 * afat të shkurtër: shfletuesi e rifreskon sa kohë studenti shkruan, dhe ajo
 * shuhet vetë kur ai ndalet. Kështu nuk mbetet kurrë e ngecur.
 */
const TYPING_SECONDS = 6;

export async function setTyping(conversationId: string): Promise<ActionState> {
  const me = await requireUser();

  await db.conversationMember.updateMany({
    where: { conversationId, userId: me.id },
    data: { typingUntil: new Date(Date.now() + TYPING_SECONDS * 1000) },
  });

  return succeed();
}

/** Redaktimi i një mesazhi. Vetëm i yti, dhe shenohet si i redaktuar. */
export async function editMessage(messageId: string, text: string): Promise<ActionState> {
  const me = await requireParticipant();

  const trimmed = text.trim();
  if (trimmed.length < 1 || trimmed.length > 2000) return fail("errors.generic");

  const message = await db.message.findFirst({
    where: { id: messageId, authorId: me.id, deletedAt: null },
    select: { id: true, conversationId: true },
  });
  if (!message) return fail("errors.forbidden");

  const verdict = await screen(trimmed);
  if (!verdict.allowed) return fail(`guard.${verdict.category}`);

  await db.message.update({
    where: { id: message.id },
    data: { text: trimmed, editedAt: new Date() },
  });

  revalidatePath(`/mesazhe/${message.conversationId}`);
  return succeed();
}

/**
 * Fshirja e një mesazhi.
 *
 * E butë: rreshti mbetet që rendi i bisedës dhe përgjigjet të mos thyhen, por
 * teksti dhe skedarët nuk shfaqen më. Tjetri e sheh që aty pati diçka, jo çfarë.
 */
export async function deleteMessage(messageId: string): Promise<ActionState> {
  const me = await requireUser();

  const message = await db.message.findFirst({
    where: { id: messageId, authorId: me.id, deletedAt: null },
    select: { id: true, conversationId: true },
  });
  if (!message) return fail("errors.forbidden");

  await db.message.update({
    where: { id: message.id },
    data: { deletedAt: new Date(), text: "", media: "[]" },
  });

  revalidatePath(`/mesazhe/${message.conversationId}`);
  return succeed();
}

/** Reagimi me emoji. Një për person dhe për mesazh; i njëjti e heq reagimin. */
export async function reactToMessage(messageId: string, emoji: string): Promise<ActionState> {
  const me = await requireParticipant();

  const allowed = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
  if (!allowed.includes(emoji)) return fail("errors.generic");

  const message = await db.message.findFirst({
    where: { id: messageId, deletedAt: null },
    select: { id: true, conversationId: true },
  });
  if (!message) return fail("errors.notFoundContent");

  const membership = await db.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: message.conversationId, userId: me.id } },
    select: { id: true },
  });
  if (!membership) return fail("errors.forbidden");

  const existing = await db.messageReaction.findUnique({
    where: { messageId_userId: { messageId, userId: me.id } },
    select: { emoji: true },
  });

  if (existing?.emoji === emoji) {
    await db.messageReaction.delete({ where: { messageId_userId: { messageId, userId: me.id } } });
  } else {
    await db.messageReaction.upsert({
      where: { messageId_userId: { messageId, userId: me.id } },
      create: { messageId, userId: me.id, emoji },
      update: { emoji },
    });
  }

  revalidatePath(`/mesazhe/${message.conversationId}`);
  return succeed();
}

/**
 * A e sheh dot ky student storjen: jo e tija, jo e bllokuar, dhe profili i
 * autorit publik ose ndjekje e pranuar. I njëjti rregull si te `getAuthorStories`.
 */
async function storyForReply(me: Sender, storyId: string) {
  const story = await db.story.findUnique({
    where: { id: storyId },
    select: { id: true, authorId: true, author: { select: { isPrivate: true } } },
  });
  if (!story || story.authorId === me.id) return null;
  if (story.author.isPrivate) {
    const follows = await db.follow.findFirst({
      where: { followerId: me.id, followingId: story.authorId, ...acceptedFollow },
      select: { id: true },
    });
    if (!follows) return null;
  }
  return story;
}

/**
 * Përgjigja te një storje. Shkon si mesazh te biseda me autorin, me storjen
 * bashkë, që ai ta dijë se për cilën bëhet fjalë.
 */
export async function replyToStory(storyId: string, text: string): Promise<ActionState & { conversationId?: string }> {
  const me = await requireParticipant();
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > 1000) return fail("errors.generic");

  const story = await storyForReply(me, storyId);
  if (!story) return fail("errors.notFoundContent");

  const opened = await startConversation(story.authorId);
  if (!opened.ok || !opened.conversationId) return opened;

  const sent = await deliver(me, opened.conversationId, trimmed, { kind: "story_reply", storyId: story.id });
  return sent.ok ? { ...sent, conversationId: opened.conversationId } : sent;
}

/**
 * Reagimi te një storje. Një reagim për person dhe storje: reagimi i dytë e
 * ndërron emoji-n, nuk shton mesazh të ri.
 */
export async function reactToStory(storyId: string, emoji: string): Promise<ActionState> {
  const me = await requireParticipant();
  if (!(STORY_REACTIONS as readonly string[]).includes(emoji)) return fail("errors.generic");

  const story = await storyForReply(me, storyId);
  if (!story) return fail("errors.notFoundContent");

  const existing = await db.message.findFirst({
    where: { storyId: story.id, authorId: me.id, kind: "story_reaction", deletedAt: null },
    select: { id: true, text: true, conversationId: true },
  });
  if (existing) {
    if (existing.text !== emoji) {
      await db.message.update({ where: { id: existing.id }, data: { text: emoji } });
      revalidatePath(`/mesazhe/${existing.conversationId}`);
    }
    return succeed();
  }

  const opened = await startConversation(story.authorId);
  if (!opened.ok || !opened.conversationId) return opened;
  return deliver(me, opened.conversationId, emoji, { kind: "story_reaction", storyId: story.id });
}

/** Sa biseda merr një ndarje e vetme: mjafton për shokët, pak për spam. */
const MAX_SHARE_TARGETS = 20;

/**
 * «Dërgo»: postimi shkon si kartë te bisedat e zgjedhura, me një shënim nëse do.
 *
 * Ndan vetëm kush e sheh postimin. Njerëzit e rinj kalojnë nga `startConversation`,
 * që vendos vetë nëse biseda hapet drejt apo si kërkesë, dhe bisedat ekzistuese
 * pranohen vetëm kur studenti është brenda tyre. Marrësi e sheh postimin vetëm
 * nëse edhe ai e ka në rrethin e vet: përndryshe karta thotë që nuk hapet.
 */
export async function sharePost(
  postId: string,
  targets: { userIds: string[]; conversationIds: string[] },
  note: string,
): Promise<ActionState & { sent?: number }> {
  const me = await requireParticipant();

  const post = await db.post.findFirst({
    where: { id: postId, ...postScopeFilter(me.access) },
    select: { id: true, isAnonymous: true },
  });
  if (!post) return fail("errors.notFoundContent");
  // Zëri i kampusit mbetet anonim dhe në dhomën e vet: nuk ndahet në biseda.
  if (post.isAnonymous) return fail("errors.forbidden");

  const userIds = [...new Set(targets.userIds)].filter((id) => id !== me.id);
  const conversationIds = [...new Set(targets.conversationIds)];
  if (userIds.length + conversationIds.length === 0) return fail("errors.generic");
  if (userIds.length + conversationIds.length > MAX_SHARE_TARGETS) return fail("errors.generic");

  const destinations = new Set<string>();
  for (const userId of userIds) {
    const opened = await startConversation(userId);
    if (opened.ok && opened.conversationId) destinations.add(opened.conversationId);
  }
  if (conversationIds.length > 0) {
    const mine = await db.conversationMember.findMany({
      where: { userId: me.id, conversationId: { in: conversationIds } },
      select: { conversationId: true },
    });
    for (const row of mine) destinations.add(row.conversationId);
  }

  let sent = 0;
  for (const conversationId of destinations) {
    const result = await deliver(me, conversationId, note, { kind: "post_share", postId: post.id });
    if (result.ok) sent += 1;
  }
  if (sent === 0) return fail("messages.shareFailed");
  return { ...succeed(), sent };
}
