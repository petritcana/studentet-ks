"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { MAX_HIGHLIGHT_STORIES, MAX_HIGHLIGHT_TITLE, MAX_HIGHLIGHTS } from "@/lib/highlight-limits";
import { requireUser, requireParticipant } from "@/lib/session";
import { fail, succeed, type ActionState } from "./types";


const schema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(MAX_HIGHLIGHT_TITLE),
  storyIds: z.array(z.string()).min(1).max(MAX_HIGHLIGHT_STORIES),
  coverUrl: z.string().max(4000).nullable().optional(),
});

/**
 * Krijon ose ndryshon një dosje storjesh në profil.
 *
 * Futen vetëm storjet e vetë pronarit, në rendin që i zgjodhi. Kur ndryshohet,
 * lista e storjeve zëvendësohet e tëra.
 */
export async function saveHighlight(input: {
  id?: string;
  title: string;
  storyIds: string[];
  /** Fotoja e rrethit: një foto e ngarkuar nga pronari, ose fotoja e një storjeje të dosjes. */
  coverUrl?: string | null;
}): Promise<ActionState & { id?: string }> {
  const me = await requireParticipant();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("highlights.errorInvalid");
  const { id, title } = parsed.data;
  const storyIds = [...new Set(parsed.data.storyIds)];

  const own = await db.story.findMany({
    where: { id: { in: storyIds }, authorId: me.id },
    select: { id: true, kind: true, mediaUrl: true },
  });
  const ownIds = new Set(own.map((story) => story.id));
  const ordered = storyIds.filter((storyId) => ownIds.has(storyId));
  if (ordered.length === 0) return fail("highlights.errorInvalid");

  const coverUrl = await validCover(me.id, parsed.data.coverUrl ?? null, own);
  if (coverUrl === false) return fail("highlights.errorInvalid");

  let highlightId = id;
  if (highlightId) {
    const existing = await db.storyHighlight.findFirst({ where: { id: highlightId, userId: me.id }, select: { id: true } });
    if (!existing) return fail("errors.forbidden");
    await db.$transaction([
      db.storyHighlight.update({ where: { id: highlightId }, data: { title, coverUrl } }),
      db.storyHighlightItem.deleteMany({ where: { highlightId } }),
      db.storyHighlightItem.createMany({
        data: ordered.map((storyId, position) => ({ highlightId: highlightId!, storyId, position })),
      }),
    ]);
  } else {
    const count = await db.storyHighlight.count({ where: { userId: me.id } });
    if (count >= MAX_HIGHLIGHTS) return fail("highlights.errorTooMany");
    const created = await db.storyHighlight.create({
      data: {
        userId: me.id,
        title,
        coverUrl,
        position: count,
        items: { create: ordered.map((storyId, position) => ({ storyId, position })) },
      },
      select: { id: true },
    });
    highlightId = created.id;
  }

  revalidatePath("/une");
  revalidatePath(`/u/${me.username}`);
  return { ...succeed("highlights.saved"), id: highlightId };
}

/**
 * Fotoja e rrethit pranohet vetëm kur është e pronarit: ose foto e ngarkuar prej
 * tij (`/api/media/id`), ose fotoja e një storjeje që është brenda dosjes.
 * Kthen adresën, null kur s'ka foto të zgjedhur, ose false kur nuk lejohet.
 */
async function validCover(
  userId: string,
  coverUrl: string | null,
  stories: { kind: string; mediaUrl: string }[],
): Promise<string | null | false> {
  if (!coverUrl) return null;
  if (stories.some((story) => story.kind === "image" && story.mediaUrl === coverUrl)) return coverUrl;
  const match = /^\/api\/media\/([A-Za-z0-9_-]+)$/.exec(coverUrl);
  if (!match) return false;
  const asset = await db.mediaAsset.findFirst({ where: { id: match[1], ownerId: userId, kind: "image" }, select: { id: true } });
  return asset ? coverUrl : false;
}

export async function deleteHighlight(id: string): Promise<ActionState> {
  const me = await requireUser();
  const result = await db.storyHighlight.deleteMany({ where: { id, userId: me.id } });
  if (result.count === 0) return fail("errors.forbidden");
  revalidatePath("/une");
  revalidatePath(`/u/${me.username}`);
  return succeed("highlights.deleted");
}

export type HighlightChoice = { id: string; title: string; cover: string | null; contains: boolean };

/** Dosjet e mia, për «Shto në dosje» te shikuesi, me shenjë nëse storja është tashmë brenda. */
export async function listHighlightChoices(storyId: string): Promise<HighlightChoice[]> {
  const me = await requireUser();
  const rows = await db.storyHighlight.findMany({
    where: { userId: me.id },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      coverUrl: true,
      items: { orderBy: { position: "asc" }, select: { storyId: true, story: { select: { kind: true, mediaUrl: true } } } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    cover: row.coverUrl ?? row.items.find((item) => item.story.kind === "image")?.story.mediaUrl ?? null,
    contains: row.items.some((item) => item.storyId === storyId),
  }));
}

/** Shton një storje të vetën në fund të një dosjeje ekzistuese. */
export async function addStoryToHighlight(storyId: string, highlightId: string): Promise<ActionState> {
  const me = await requireParticipant();
  const [story, highlight] = await Promise.all([
    db.story.findFirst({ where: { id: storyId, authorId: me.id }, select: { id: true } }),
    db.storyHighlight.findFirst({
      where: { id: highlightId, userId: me.id },
      select: { id: true, _count: { select: { items: true } } },
    }),
  ]);
  if (!story || !highlight) return fail("errors.forbidden");
  if (highlight._count.items >= MAX_HIGHLIGHT_STORIES) return fail("highlights.errorTooMany");

  await db.storyHighlightItem.upsert({
    where: { highlightId_storyId: { highlightId, storyId } },
    create: { highlightId, storyId, position: highlight._count.items },
    update: {},
  });
  revalidatePath("/une");
  revalidatePath(`/u/${me.username}`);
  return succeed("highlights.added");
}
