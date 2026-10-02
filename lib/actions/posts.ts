"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { onContentHidden, onPostSaved } from "@/lib/competition/contributions";
import { requireUser, requireParticipant } from "@/lib/session";
import { canPostWithScope, postScopeFilter, shouldSeeAds } from "@/lib/access";
import { can } from "@/lib/permissions";
import { notify, notifyMentions } from "@/lib/notify";
import { hasFeature } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { POST_TEXT_LIMIT } from "@/lib/constants";
import { MAX_POST_IMAGES, serializeMedia, type MediaRef } from "@/lib/media";
import { applyAutoHide, meetsLevelTwo, pseudonymFor, screen } from "@/lib/moderation";
import { awardActivityXp, touchStreak } from "@/lib/rewards";
import { POST_SCOPES, POST_TYPES, REACTION_TYPES, REPORT_REASONS } from "@/lib/types";
import { fail, succeed, type ActionState } from "./types";

const createSchema = z.object({
  type: z.enum(POST_TYPES),
  scope: z.enum(POST_SCOPES),
  text: z.string().trim().max(POST_TEXT_LIMIT),
  courseId: z.string().optional().nullable(),
  /** Kur postimi shkon te një grup. Anëtarësia kontrollohet te serveri. */
  groupId: z.string().optional().nullable(),
  pollOptions: z.array(z.string().trim().min(1).max(80)).max(4).optional(),
  media: z
    .array(
      z.object({
        id: z.string().regex(/^[a-f0-9]{8,64}$/),
        kind: z.enum(["image", "video"]),
        extension: z.string().regex(/^[a-z0-9]{2,6}$/),
        width: z.number().int().positive().nullable(),
        height: z.number().int().positive().nullable(),
        durationMs: z.number().int().nonnegative().nullable(),
      }),
    )
    .max(MAX_POST_IMAGES)
    .optional(),
});

export async function createPost(input: {
  type: string;
  scope: string;
  text: string;
  courseId?: string | null;
  /** Grupi ku shkon postimi. Anëtarësia kontrollohet te serveri. */
  groupId?: string | null;
  pollOptions?: string[];
  media?: MediaRef[];
}): Promise<ActionState & { postId?: string }> {
  const me = await requireParticipant();

  const limit = rateLimit("post", me.id);
  if (!limit.ok) return fail("errors.rateLimited");

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fail("errors.generic");

  const data = parsed.data;
  const anonymous = data.type === "campus_voice";

  // Shtrirja kalon nëpër shtresën e vetme të autorizimit.
  if (!canPostWithScope(me.access, data.scope).allowed) {
    return fail("pro.lockedScopeTitle");
  }

  if (anonymous && !meetsLevelTwo({ createdAt: me.createdAt, isVerified: me.isVerified })) {
    return fail("feed.anonymousLocked");
  }

  const verdict = await screen(data.text, { anonymous });
  if (!verdict.allowed) return fail(`guard.${verdict.category}`);

  if (data.type === "poll" && (data.pollOptions ?? []).filter(Boolean).length < 2) {
    return fail("errors.generic");
  }

  /*
    Postimi te një grup kërkon anëtarësi.

    Kontrollohet këtu, jo te faqja: kush e dërgon kërkesën me dorë duhet të
    ndalet nga e njëjta rregull që e fsheh kutinë e shkrimit.
  */
  let groupId: string | null = null;
  if (data.groupId) {
    const membership = await db.groupMember.findFirst({
      where: { groupId: data.groupId, userId: me.id, role: { in: ["member", "owner"] } },
      select: { id: true },
    });
    if (!membership) return fail("errors.forbidden");
    groupId = data.groupId;
  }

  const post = await db.post.create({
    data: {
      authorId: me.id,
      type: data.type,
      text: data.text,
      scope: anonymous ? "faculty" : data.scope,
      courseId: data.courseId || null,
      groupId,
      facultyId: me.facultyId,
      universityId: me.universityId,
      isAnonymous: anonymous,
      pseudonym: null,
      media: serializeMedia(parsed.data.media ?? []),
    },
  });

  // Pseudonimi varet nga fija, prandaj vendoset pasi postimi merr id.
  if (anonymous) {
    await db.post.update({
      where: { id: post.id },
      data: { pseudonym: `Studenti #${pseudonymFor(me.id, post.id)}` },
    });
  }

  if (data.type === "poll") {
    await db.pollOption.createMany({
      data: (data.pollOptions ?? []).map((text, order) => ({ postId: post.id, text, order })),
    });
  }

  await awardActivityXp(me.id, "post");
  await touchStreak(me.id);

  /*
    Postimi te një grup e mëson tërë grupin.

    Grumbullohet sipas grupit: dhjetë postime brenda ditës janë një rresht që
    thotë «ka lëvizje aty», jo dhjetë njoftime që studenti i fshin një nga një.
  */
  if (post.groupId) {
    const members = await db.groupMember.findMany({
      where: { groupId: post.groupId, role: { in: ["member", "owner"] }, NOT: { userId: me.id } },
      select: { userId: true },
      take: 200,
    });

    for (const member of members) {
      await notify({
        userId: member.userId,
        category: "groups",
        type: "group_post",
        actorId: me.id,
        targetId: post.groupId,
        targetType: "group",
        groupKey: `group_post:${post.groupId}`,
      });
    }
  }

  // Përmendjet te vetë postimi njoftohen njësoj si te komentet.
  if (data.type !== "campus_voice") {
    await notifyMentions({
      text: data.text,
      actorId: me.id,
      targetId: post.id,
      targetType: "post",
      postId: post.id,
    });
  }

  revalidatePath("/feed");
  return { ...succeed("feed.posted"), postId: post.id };
}

export async function toggleReaction(
  postId: string,
  type: string = "like",
): Promise<ActionState & { reactions?: string[]; counts?: Record<string, number> }> {
  const me = await requireParticipant();

  if (!can(me.actor, "comment").allowed) return fail("verify.lockedTitle");
  if (!(REACTION_TYPES as readonly string[]).includes(type)) return fail("errors.generic");

  const existing = await db.reaction.findUnique({
    where: { userId_postId_type: { userId: me.id, postId, type } },
  });

  if (existing) {
    await db.reaction.delete({ where: { id: existing.id } });
    await db.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } });
  } else {
    await db.reaction.create({ data: { userId: me.id, postId, type } });
    await db.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } });
    await awardActivityXp(me.id, "reaction", postId);

    /*
      Autori e mëson që dikush e pëlqeu.

      Grumbullohet sipas postimit: dhjetë pëlqime janë një rresht, jo dhjetë.
      Postimet anonime nuk njoftojnë askënd, sepse autori i tyre nuk duhet lidhur
      me postimin as nga njoftimet e veta.
    */
    const liked = await db.post.findUnique({
      where: { id: postId },
      select: { authorId: true, isAnonymous: true },
    });

    if (liked && !liked.isAnonymous) {
      await notify({
        userId: liked.authorId,
        category: "social",
        type: "reaction",
        actorId: me.id,
        targetId: postId,
        targetType: "post",
        groupKey: `reaction:${postId}`,
      });
    }
  }

  const [grouped, mine] = await Promise.all([
    db.reaction.groupBy({ by: ["type"], where: { postId }, _count: { type: true } }),
    db.reaction.findMany({ where: { postId, userId: me.id }, select: { type: true } }),
  ]);

  return {
    ...succeed(),
    reactions: mine.map((row) => row.type),
    counts: Object.fromEntries(grouped.map((row) => [row.type, row._count.type])),
  };
}

/**
 * Ripostimi. Një ripostim është postim më vete që mban lidhjen me origjinalin,
 * që të dalë te ndjekësit e atij që e ndan. Klikimi i dytë e heq.
 */
export async function toggleRepost(postId: string): Promise<ActionState & { reposted?: boolean; count?: number }> {
  const me = await requireParticipant();

  if (!can(me.actor, "post").allowed) return fail("verify.lockedTitle");

  const limit = rateLimit("post", me.id);
  if (!limit.ok) return fail("errors.rateLimited");

  const original = await db.post.findFirst({
    where: { ...postScopeFilter(me.access), id: postId, isHidden: false },
    select: { id: true, repostOfId: true, isAnonymous: true, authorId: true },
  });
  if (!original || original.isAnonymous) return fail("errors.notFoundContent");

  // Ripostimi i një ripostimi ndan origjinalin.
  const targetId = original.repostOfId ?? original.id;

  const existing = await db.post.findFirst({
    where: { authorId: me.id, repostOfId: targetId },
    select: { id: true },
  });

  if (existing) {
    await db.post.delete({ where: { id: existing.id } });
    const updated = await db.post.update({
      where: { id: targetId },
      data: { repostCount: { decrement: 1 } },
      select: { repostCount: true },
    });
    revalidatePath("/feed");
    return { ...succeed(), reposted: false, count: Math.max(0, updated.repostCount) };
  }

  await db.post.create({
    data: {
      authorId: me.id,
      type: "repost",
      text: "",
      scope: "faculty",
      facultyId: me.facultyId,
      universityId: me.universityId,
      media: "[]",
      repostOfId: targetId,
    },
  });
  const updated = await db.post.update({
    where: { id: targetId },
    data: { repostCount: { increment: 1 } },
    select: { repostCount: true },
  });

  revalidatePath("/feed");
  return { ...succeed("feed.reposted"), reposted: true, count: updated.repostCount };
}

export async function toggleBookmark(
  targetId: string,
  targetType: string,
): Promise<ActionState & { saved?: boolean }> {
  const me = await requireUser();

  const existing = await db.bookmark.findUnique({
    where: { userId_targetId_targetType: { userId: me.id, targetId, targetType } },
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
    await onPostSaved(targetId);
  }
  return { ...succeed("common.saved"), saved: true };
}

export async function addComment(
  postId: string,
  text: string,
  parentId?: string | null,
): Promise<ActionState> {
  const me = await requireParticipant();

  const limit = rateLimit("comment", me.id);
  if (!limit.ok) return fail("errors.rateLimited");

  const trimmed = text.trim();
  if (trimmed.length < 2 || trimmed.length > 1000) return fail("errors.generic");

  /*
    Komentimi te një postim i tërë Kosovës është veçori e Pro-s.

    Leximi mbetet i hapur për këdo: ajo që kufizohet është pjesëmarrja, sepse një
    fije kombëtare pa asnjë kufi bëhet vendi i parë ku vjen spam-i. Kontrolli
    bëhet këtu, jo te butoni: fshehja te ndërfaqja është paraqitje, jo siguri.
  */
  const target = await db.post.findUnique({
    where: { id: postId },
    select: { scope: true, isHidden: true },
  });
  if (!target || target.isHidden) return fail("errors.notFoundContent");
  if (target.scope === "national" && !hasFeature(me.actor, "public_comments")) {
    return fail("pro.lockedPublicComment");
  }

  const verdict = await screen(trimmed);
  if (!verdict.allowed) return fail(`guard.${verdict.category}`);

  /*
    Përgjigja rri te një nivel i vetëm.

    Një përgjigje te një përgjigje shkon te prindi i parë: fijet e thella janë
    të vështira për t'u lexuar në telefon, dhe biseda humbet te shkalla e pestë.
    Prindi duhet t'i takojë të njëjtit postim, që një id e huaj të mos hyjë këtu.
  */
  let parent: { id: string; authorId: string } | null = null;
  if (parentId) {
    const found = await db.comment.findFirst({
      where: { id: parentId, postId, isHidden: false },
      select: { id: true, authorId: true, parentId: true },
    });
    if (found) {
      parent = found.parentId
        ? await db.comment.findFirst({
            where: { id: found.parentId, postId },
            select: { id: true, authorId: true },
          })
        : { id: found.id, authorId: found.authorId };
    }
  }

  await db.comment.create({
    data: { postId, authorId: me.id, text: trimmed, parentId: parent?.id ?? null },
  });
  await db.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });

  // Kush përmendet me `@` te komenti e mëson menjëherë.
  await notifyMentions({
    text: trimmed,
    actorId: me.id,
    targetId: postId,
    targetType: "comment",
    postId,
  });

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true, isAnonymous: true },
  });

  // Një fije anonime e mban anonimitetin edhe te komentet, përndryshe autori do
  // te zbulohej nga i pari që i pergjigjet.
  if (post?.isAnonymous) {
    await db.comment.updateMany({
      where: { postId, authorId: me.id, pseudonym: null },
      data: { pseudonym: `Studenti #${pseudonymFor(me.id, postId)}` },
    });
  }

  if (post && post.authorId !== me.id && !post.isAnonymous) {
    await db.notification.create({
      data: {
        userId: post.authorId,
        category: "social",
        type: "comment",
        actorId: me.id,
        targetId: postId,
        targetType: "post",
        payload: JSON.stringify({}),
      },
    });
  }

  // Autori i komentit mëson që dikush iu përgjigj, i grumbulluar sipas fijes.
  // Te një fije anonime njoftimi vjen pa emër, si vetë përgjigjja.
  if (parent && parent.authorId !== me.id) {
    await notify({
      userId: parent.authorId,
      category: "social",
      type: "reply",
      actorId: post?.isAnonymous ? null : me.id,
      targetId: postId,
      targetType: "post",
      groupKey: `reply:${parent.id}`,
    });
  }

  await awardActivityXp(me.id, "comment");
  await touchStreak(me.id);

  revalidatePath(`/postimi/${postId}`);
  revalidatePath("/feed");
  return succeed();
}

export async function votePoll(postId: string, optionId: string): Promise<ActionState> {
  const me = await requireParticipant();

  const existing = await db.pollVote.findUnique({
    where: { userId_postId: { userId: me.id, postId } },
  });
  if (existing) await db.pollVote.update({ where: { id: existing.id }, data: { optionId } });
  else await db.pollVote.create({ data: { userId: me.id, postId, optionId } });

  revalidatePath("/feed");
  return succeed();
}

export async function deletePost(postId: string): Promise<ActionState> {
  const me = await requireUser();
  const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (!post) return fail("errors.notFoundContent");
  if (post.authorId !== me.id && me.role !== "moderator" && me.role !== "admin") {
    return fail("errors.forbidden");
  }

  await db.post.delete({ where: { id: postId } });
  await onContentHidden("post", postId);
  revalidatePath("/feed");
  return succeed("feed.deleted");
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
  if (!limit.ok) return fail("errors.rateLimited");

  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return fail("errors.generic");

  const existing = await db.report.findFirst({
    where: {
      reporterId: me.id,
      targetId: parsed.data.targetId,
      targetType: parsed.data.targetType,
    },
  });
  if (existing) return succeed("feed.reported");

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
  return succeed(hidden ? "feed.reportedHidden" : "feed.reported");
}

/** Klikimi i reklamës regjistrohet veç nga shfaqja, që CTR-ja të jetë e vërtetë. */
/**
 * Shfaqja e reklamës së shtyllës shkruhet nga shfletuesi, vetëm kur karta u shfaq
 * vërtet. Një PRO nuk e merr kurrë kartën, prandaj nuk shkruhet asgjë për të.
 */
export async function trackRailAdImpression(adId: string): Promise<ActionState> {
  const me = await requireUser();
  if (!shouldSeeAds(me.access)) return succeed();
  const ad = await db.ad.findUnique({ where: { id: adId }, select: { id: true } });
  if (!ad) return fail("errors.notFoundContent");
  await db.adImpression.create({ data: { adId, userId: me.id, placement: "rail" } });
  return succeed();
}

export async function trackAdClick(adId: string): Promise<ActionState> {
  const me = await requireUser();
  await db.adClick.create({ data: { adId, userId: me.id } });
  return succeed();
}


/**
 * Fshirja e komentit tënd.
 *
 * Përgjigjet nën të fshihen bashkë me të: pa prindin nuk kanë kontekst, dhe një
 * fije me vrima është më e vështirë për t'u lexuar se një fije më e shkurtër.
 * Numri i komenteve te postimi ulet me aq sa u fshinë vërtet.
 */
export async function deleteComment(commentId: string): Promise<ActionState> {
  const me = await requireUser();

  const comment = await db.comment.findFirst({
    where: { id: commentId, authorId: me.id },
    select: { id: true, postId: true },
  });
  if (!comment) return fail("errors.forbidden");

  const removed = await db.comment.count({
    where: { OR: [{ id: comment.id }, { parentId: comment.id }], isHidden: false },
  });

  await db.$transaction([
    db.comment.deleteMany({ where: { parentId: comment.id } }),
    db.comment.delete({ where: { id: comment.id } }),
    db.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: removed } },
    }),
  ]);

  revalidatePath(`/postimi/${comment.postId}`);
  return succeed();
}
