import "server-only";

import { db } from "@/lib/db";

/**
 * Ngjarjet e garës: rreshta të strukturuar, jo postime.
 *
 * Teksti nuk ruhet: ruhet lloji dhe vlerat, dhe faqja e ndërton fjalinë në
 * gjuhën e studentit. Kështu «Arta mundi Petritin» del njësoj shqip dhe anglisht.
 */
export type EventKind =
  | "battle_won"
  | "achievement"
  | "university_rank"
  | "daily_milestone"
  | "team_event"
  | "weekly_result"
  | "university_milestone";

export async function recordEvent(input: {
  kind: EventKind;
  actorId?: string | null;
  universityId?: string | null;
  payload?: Record<string, string | number | null>;
}) {
  await db.competitionEvent.create({
    data: {
      kind: input.kind,
      actorId: input.actorId ?? null,
      universityId: input.universityId ?? null,
      payload: JSON.stringify(input.payload ?? {}),
    },
  });
}

export type FeedItem = {
  id: string;
  kind: string;
  createdAt: string;
  actor: { name: string; username: string; avatar: string | null } | null;
  university: { name: string; abbr: string; slug: string } | null;
  payload: Record<string, string | number | null>;
};

export async function recentEvents(take = 12, universityId?: string): Promise<FeedItem[]> {
  const rows = await db.competitionEvent.findMany({
    where: universityId ? { universityId } : {},
    orderBy: { createdAt: "desc" },
    take,
  });

  const actorIds = [...new Set(rows.map((row) => row.actorId).filter((id): id is string => Boolean(id)))];
  const universityIds = [...new Set(rows.map((row) => row.universityId).filter((id): id is string => Boolean(id)))];
  const [actors, universities] = await db.$transaction([
    db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, username: true, avatar: true } }),
    db.university.findMany({ where: { id: { in: universityIds } }, select: { id: true, name: true, abbr: true, slug: true } }),
  ]);
  const actorById = new Map(actors.map((actor) => [actor.id, actor]));
  const universityById = new Map(universities.map((university) => [university.id, university]));

  return rows.map((row) => {
    const actor = row.actorId ? actorById.get(row.actorId) : undefined;
    const university = row.universityId ? universityById.get(row.universityId) : undefined;
    let payload: Record<string, string | number | null> = {};
    try {
      payload = JSON.parse(row.payload);
    } catch {
      payload = {};
    }
    return {
      id: row.id,
      kind: row.kind,
      createdAt: row.createdAt.toISOString(),
      actor: actor ? { name: actor.name, username: actor.username, avatar: actor.avatar } : null,
      university: university ? { name: university.name, abbr: university.abbr, slug: university.slug } : null,
      payload,
    };
  });
}
