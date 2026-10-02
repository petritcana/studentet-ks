"use server";

import { notifyMentions } from "@/lib/notify";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, requireParticipant } from "@/lib/session";
import { can } from "@/lib/permissions";
import { screen } from "@/lib/moderation";
import { STORIES_PER_DAY, STORY_LIFETIME_HOURS } from "@/lib/constants";
import { fail, succeed, type ActionState } from "./types";


/**
 * Krijimi i një storje.
 *
 * Nuk ka më zgjedhje shtrirjeje: storja e një profili publik hapet për ndjekësit
 * te rafti dhe për vizitorin e profilit, ndërsa e një profili privat vetëm për
 * ndjekësit e pranuar. Rregulli zbatohet te pyetjet, jo te kjo fushë.
 */
export async function createStory(input: {
  kind: string;
  mediaUrl: string;
  caption?: string;
  /** Shtresat e tekstit dhe të vizatimit, si JSON. Teksti shërben edhe si përshkrim. */
  layers?: string;
}): Promise<ActionState & { id?: string }> {
  const me = await requireParticipant();

  if (!can(me.actor, "post").allowed) return fail("verify.lockedTitle");
  if (!input.mediaUrl) return fail("errors.generic");

  const since = new Date(Date.now() - 86_400_000);
  const today = await db.story.count({ where: { authorId: me.id, createdAt: { gte: since } } });
  if (today >= STORIES_PER_DAY) return fail("stories.errorDailyLimit");

  if (input.caption) {
    const verdict = await screen(input.caption);
    if (!verdict.allowed) return fail(`guard.${verdict.category}`);
  }

  const story = await db.story.create({
    data: {
      authorId: me.id,
      kind: input.kind === "video" ? "video" : "image",
      mediaUrl: input.mediaUrl,
      caption: input.caption?.trim().slice(0, 200) || null,
      layers: input.layers ?? null,
      scope: "followers",
      expiresAt: new Date(Date.now() + STORY_LIFETIME_HOURS * 3_600_000),
    },
  });

  // Kush përmendet me @ te teksti i storjes e mëson, dhe prekja e çon te profili i autorit.
  if (story.caption) {
    await notifyMentions({ text: story.caption, actorId: me.id, targetType: "story", authorUsername: me.username });
  }

  revalidatePath("/feed");
  return { ...succeed("stories.created"), id: story.id };
}

/** Shënimi i pamjes. Pa të, rendi «të pashikuarat të parat» s'do të kishte kuptim. */
export async function markStorySeen(storyId: string): Promise<ActionState> {
  const me = await requireUser();

  await db.storyView.upsert({
    where: { storyId_userId: { storyId, userId: me.id } },
    create: { storyId, userId: me.id },
    update: {},
  });

  return succeed();
}

export async function deleteStory(storyId: string): Promise<ActionState> {
  const me = await requireUser();

  const story = await db.story.findUnique({
    where: { id: storyId },
    select: { authorId: true },
  });
  if (!story) return fail("errors.notFoundContent");
  if (story.authorId !== me.id && !can(me.actor, "moderate").allowed) {
    return fail("errors.forbidden");
  }

  await db.story.delete({ where: { id: storyId } });
  revalidatePath("/feed");
  revalidatePath("/une");
  return succeed("stories.deleted");
}

/**
 * Arkivimi: storja del nga rafti menjëherë, para 24 orëve, por mbetet te arkivi
 * i pronarit dhe mund të futet në një dosje. Vetëm pronari e bën.
 */
export async function archiveStory(storyId: string): Promise<ActionState> {
  const me = await requireUser();
  const result = await db.story.updateMany({
    where: { id: storyId, authorId: me.id, expiresAt: { gt: new Date() } },
    data: { expiresAt: new Date() },
  });
  if (result.count === 0) return fail("errors.notFoundContent");
  revalidatePath("/feed");
  revalidatePath("/une");
  return succeed("stories.archived");
}

export async function purgeExpiredStories(): Promise<ActionState & { removed?: number }> {
  const me = await requireUser();
  if (!can(me.actor, "moderate").allowed) return fail("errors.forbidden");

  // Arkivi: storjet e skaduara mbeten një vit për pronarin, dhe ato brenda një
  // dosjeje të profilit nuk fshihen kurrë nga pastrimi.
  const yearAgo = new Date(Date.now() - 365 * 86_400_000);
  const result = await db.story.deleteMany({
    where: { expiresAt: { lt: yearAgo }, highlightItems: { none: {} } },
  });
  return { ...succeed(), removed: result.count };
}
