import { db } from "@/lib/db";
import type { StoryItem } from "@/lib/queries/stories";

/**
 * Dosjet e storjeve në profil dhe arkivi i pronarit.
 *
 * Storja zhduket nga rafti pas 24 orësh, por mbetet në bazë si arkiv. Pronari
 * zgjedh prej arkivit çfarë mban në profil, në dosje me titull. Kush e sheh
 * profilin e sheh edhe dosjen: kontrolli i profilit bëhet te faqja, dhe skedarët
 * te `lib/media-access.ts`.
 */
export type HighlightView = {
  id: string;
  title: string;
  /** Fotoja e rrethit: ajo që zgjodhi pronari, ose e para e dosjes. Null kur dosja ka vetëm video. */
  cover: string | null;
  /** Fotoja që zgjodhi pronari vetë. Null kur rrethi merr storjen e parë. */
  coverUrl: string | null;
  items: StoryItem[];
};

export type ArchiveStory = { id: string; kind: string; mediaUrl: string; createdAt: string };

export async function getHighlights(ownerId: string): Promise<HighlightView[]> {
  const rows = await db.storyHighlight.findMany({
    where: { userId: ownerId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      coverUrl: true,
      items: {
        orderBy: { position: "asc" },
        select: {
          story: { select: { id: true, kind: true, mediaUrl: true, caption: true, createdAt: true } },
        },
      },
    },
  });

  return rows
    .map((row) => {
      const items: StoryItem[] = row.items.map(({ story }) => ({
        id: story.id,
        kind: story.kind,
        mediaUrl: story.mediaUrl,
        caption: story.caption,
        createdAt: story.createdAt.toISOString(),
        seen: true,
      }));
      return {
        id: row.id,
        title: row.title,
        cover: row.coverUrl ?? items.find((item) => item.kind === "image")?.mediaUrl ?? null,
        coverUrl: row.coverUrl,
        items,
      };
    })
    .filter((highlight) => highlight.items.length > 0);
}

/** Arkivi: të gjitha storjet e pronarit, edhe të skaduarat, më të rejat përpara. */
export async function getStoryArchive(ownerId: string, take = 60): Promise<ArchiveStory[]> {
  const rows = await db.story.findMany({
    where: { authorId: ownerId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, kind: true, mediaUrl: true, createdAt: true },
  });
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}
