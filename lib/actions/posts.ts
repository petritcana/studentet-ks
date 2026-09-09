"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, serializeList } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { rateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { applyAutoHide, meetsLevelTwo, screen } from "@/lib/moderation";
import { awardXp, touchStreak } from "@/lib/xp";
import { POST_TYPES, REPORT_REASONS } from "@/lib/constants";
import { fail, succeed, type ActionState } from "./types";

const createPostSchema = z.object({
  type: z.enum(POST_TYPES),
  text: z.string().trim().min(3, "Shkruaj diçka më shumë.").max(4000, "Teksti është shumë i gjatë."),
  courseId: z.string().optional().nullable(),
  groupId: z.string().optional().nullable(),
  eventId: z.string().optional().nullable(),
  materialId: z.string().optional().nullable(),
  pollOptions: z.array(z.string().trim().min(1).max(80)).max(4).optional(),
});

export async function createPost(input: {
  type: string;
  text: string;
  courseId?: string | null;
  groupId?: string | null;
  eventId?: string | null;
  materialId?: string | null;
  pollOptions?: string[];
}): Promise<ActionState & { postId?: string }> {
  const me = await requireUser();

  const limit = rateLimit("post", me.id);
  if (!limit.ok) return fail(rateLimitMessage(limit));

  const parsed = createPostSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Postimi s'është i plotë.");
  }

  const data = parsed.data;
  const anonymous = data.type === "campus_voice";

  if (anonymous) {
    // Niveli 2: më e vjetër se 7 ditë plus email i verifikuar.
    if (!meetsLevelTwo({ createdAt: me.createdAt, isVerified: me.isVerified })) {
      return fail(
        "Zëri i kampusit hapet pas shtatë ditësh dhe me email institucional të verifikuar.",
      );
    }
  }

  const verdict = await screen(data.text, { anonymous });
  if (!verdict.allowed) return fail(verdict.message ?? "Ky tekst nuk kalon.");

  if (data.type === "poll") {
    const options = (data.pollOptions ?? []).filter(Boolean);
    if (options.length < 2) return fail("Sondazhi kërkon të paktën dy opsione.");
  }

  const post = await db.post.create({
    data: {
      authorId: me.id,
      type: data.type,
      text: data.text,
      courseId: data.courseId || null,
      groupId: data.groupId || null,
      eventId: data.eventId || null,
      materialId: data.materialId || null,
      facultyId: me.facultyId,
      isAnonymous: anonymous,
      pseudonym: anonymous ? `Studenti #${Math.floor(1 + Math.random() * 99)}` : null,
      media: serializeList([]),
    },
  });

  if (data.type === "poll") {
    await db.pollOption.createMany({
      data: (data.pollOptions ?? []).map((text, order) => ({
        postId: post.id,
        text,
        order,
      })),
    });
  }

  await awardXp(me.id, "post");
  await touchStreak(me.id);

  revalidatePath("/feed");
  return { ...succeed("E postove."), postId: post.id };
}

export async function toggleReaction(postId: string): Promise<ActionState & { liked?: boolean }> {
  const me = await requireUser();

  const existing = await db.reaction.findUnique({
    where: { userId_postId: { userId: me.id, postId } },
  });

  if (existing) {
    await db.reaction.delete({ where: { id: existing.id } });
    await db.post.update({
      where: { id: postId },
      data: { likeCount: { decrement: 1 } },
    });
    return { ...succeed(), liked: false };
  }

  await db.reaction.create({ data: { userId: me.id, postId, type: "like" } });
  await db.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } });

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true, isAnonymous: true },
  });
  if (post && post.authorId !== me.id && !post.isAnonymous) {
    await db.notification.create({
      data: {
        userId: post.authorId,
        type: "comment",
        actorId: me.id,
        targetId: postId,
        text: "e pëlqeu postimin tënd",
      },
    });
  }

  return { ...succeed(), liked: true };
}

export async function toggleBookmark(
  targetId: string,
  targetType: string,
): Promise<ActionState & { saved?: boolean }> {
  const me = await requireUser();

  const existing = await db.bookmark.findUnique({
    where: {
      userId_targetId_targetType: { userId: me.id, targetId, targetType },
    },
  });

  if (existing) {
    await db.bookmark.delete({ where: { id: existing.id } });
    if (targetType === "post") {
      await db.post.update({ where: { id: targetId }, data: { saveCount: { decrement: 1 } } });
    }
    return { ...succeed(), saved: false };
  }

  await db.bookmark.create({ data: { userId: me.id, targetId, targetType } });
  if (targetType === "post") {
    await db.post.update({ where: { id: targetId }, data: { saveCount: { increment: 1 } } });
  }
  return { ...succeed("E ruajtëm. E gjen te Unë · Ruajtjet."), saved: true };
}

export async function addComment(postId: string, text: string): Promise<ActionState> {
  const me = await requireUser();

  const limit = rateLimit("comment", me.id);
  if (!limit.ok) return fail(rateLimitMessage(limit));

  const trimmed = text.trim();
  if (trimmed.length < 2) return fail("Shkruaj diçka para se ta dërgosh.");
  if (trimmed.length > 1000) return fail("Komenti është shumë i gjatë.");

  const verdict = await screen(trimmed);
  if (!verdict.allowed) return fail(verdict.message ?? "Ky koment nuk kalon.");

  await db.comment.create({ data: { postId, authorId: me.id, text: trimmed } });
  await db.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true, isAnonymous: true },
  });
  if (post && post.authorId !== me.id && !post.isAnonymous) {
    await db.notification.create({
      data: {
        userId: post.authorId,
        type: "comment",
        actorId: me.id,
        targetId: postId,
        text: "komentoi te postimi yt",
        context: `«${trimmed.slice(0, 60)}»`,
      },
    });
  }

  await awardXp(me.id, "comment");
  await touchStreak(me.id);
  revalidatePath(`/postimi/${postId}`);
  revalidatePath("/feed");
  return succeed();
}

export async function votePoll(postId: string, optionId: string): Promise<ActionState> {
  const me = await requireUser();

  const existing = await db.pollVote.findUnique({
    where: { userId_postId: { userId: me.id, postId } },
  });
  if (existing) {
    await db.pollVote.update({ where: { id: existing.id }, data: { optionId } });
  } else {
    await db.pollVote.create({ data: { userId: me.id, postId, optionId } });
  }

  revalidatePath("/feed");
  return succeed();
}

export async function deletePost(postId: string): Promise<ActionState> {
  const me = await requireUser();
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });
  if (!post) return fail("Ky postim s'ekziston më.");
  if (post.authorId !== me.id && me.role !== "moderator" && me.role !== "admin") {
    return fail("Ky postim nuk është yti.");
  }

  await db.post.delete({ where: { id: postId } });
  revalidatePath("/feed");
  return succeed("E fshive.");
}

const reportSchema = z.object({
  targetId: z.string().min(1),
  targetType: z.enum(["post", "comment", "material", "user", "message", "answer"]),
  reason: z.enum(REPORT_REASONS),
  note: z.string().trim().max(500).optional(),
});

export async function reportContent(input: {
  targetId: string;
  targetType: string;
  reason: string;
  note?: string;
}): Promise<ActionState> {
  const me = await requireUser();

  const limit = rateLimit("report", me.id);
  if (!limit.ok) return fail(rateLimitMessage(limit));

  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return fail("Zgjidh arsyen e raportimit.");

  const existing = await db.report.findFirst({
    where: {
      reporterId: me.id,
      targetId: parsed.data.targetId,
      targetType: parsed.data.targetType,
    },
  });
  if (existing) return succeed("E kemi marrë raportin tënd.");

  await db.report.create({
    data: {
      reporterId: me.id,
      targetId: parsed.data.targetId,
      targetType: parsed.data.targetType,
      reason: parsed.data.reason,
      note: parsed.data.note || null,
    },
  });

  const hidden = await applyAutoHide(parsed.data.targetId, parsed.data.targetType);

  revalidatePath("/feed");
  return succeed(
    hidden
      ? "E fshehëm derisa ta shikojë një moderator."
      : "E morëm raportin. E shikojmë brenda 24 orësh.",
  );
}
