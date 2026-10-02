import { NextResponse } from "next/server";
import { getLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { acceptedFollow } from "@/lib/follow";
import { getCurrentUser } from "@/lib/session";

/** Ku çon secili lloj njoftimi. Rrugët nuk përkthehen. */
function hrefFor(type: string, targetType: string | null, targetId: string | null) {
  // Njoftimet e garës pa objekt të vetin (fundi i javës, renditja) çojnë te gara.
  if (targetType === "competition") return "/gara";
  if (!targetId) return null;
  if (targetType === "post") return `/postimi/${targetId}`;
  if (targetType === "material") return `/materialet/${targetId}`;
  if (targetType === "question") return `/pyetje/${targetId}`;
  if (targetType === "answer") return `/pyetje/${targetId}`;
  if (targetType === "event") return `/eventet/${targetId}`;
  if (targetType === "job") return `/karriera/${targetId}`;
  if (targetType === "battle") return `/gara/beteja/${targetId}`;
  if (targetType === "team_event") return `/gara/ngjarje/${targetId}`;
  if (targetType === "conversation") return `/mesazhe/${targetId}`;
  if (targetType === "voice_room") return `/zeri/${targetId}`;
  if (targetType === "feedback") return "/admin/testimi";
  if (targetType === "profile") return `/u/${targetId}`;
  if (type.startsWith("pro_") || type === "xp_enough") return "/une/pro";
  return null;
}

function parsePayload(raw: string): Record<string, string | number> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Njoftimet e panelit anësor.
 *
 * Bashkohen sipas `groupKey`: pesë pëlqime bëhen një rresht, jo pesë. Teksti
 * ruhet si çelës plus vlera, kurrë i përkthyer, që ndërrimi i gjuhës ta ndryshojë
 * edhe historikun.
 */
export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ items: [] }, { status: 401 });

  const url = new URL(request.url);
  const category = url.searchParams.get("kategoria");
  const locale = await getLocale();
  const english = locale === "en";

  const rows = await db.notification.findMany({
    where: { userId: me.id, ...(category && category !== "all" ? { category } : {}) },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      category: true,
      type: true,
      payload: true,
      groupKey: true,
      isRead: true,
      createdAt: true,
      targetId: true,
      targetType: true,
      actor: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          year: true,
          faculty: { select: { name: true, nameEn: true } },
        },
      },
    },
  });

  const actorIds = [...new Set(rows.map((row) => row.actor?.id).filter(Boolean) as string[])];
  const following = await db.follow.findMany({
    where: { ...acceptedFollow, followerId: me.id, followingId: { in: actorIds } },
    select: { followingId: true },
  });
  const followingIds = new Set(following.map((item) => item.followingId));

  // Bashkimi: i njëjti groupKey shfaqet një herë, me numëruesin te payload-i.
  const seen = new Map<string, number>();
  const items = [];

  for (const row of rows) {
    const key = row.groupKey ?? row.id;
    if (seen.has(key)) {
      const index = seen.get(key)!;
      const payload = items[index].payload;
      payload.grouped = Number(payload.grouped ?? 1) + 1;
      continue;
    }

    seen.set(key, items.length);
    items.push({
      id: row.id,
      category: row.category,
      type: row.type,
      payload: parsePayload(row.payload),
      isRead: row.isRead,
      createdAt: row.createdAt.toISOString(),
      href: hrefFor(row.type, row.targetType, row.targetId),
      actor: row.actor
        ? {
            id: row.actor.id,
            name: row.actor.name,
            username: row.actor.username,
            avatar: row.actor.avatar,
            facultyLabel: english ? row.actor.faculty?.nameEn ?? null : row.actor.faculty?.name ?? null,
            year: row.actor.year,
            alreadyFollowing: followingIds.has(row.actor.id),
          }
        : null,
    });
  }

  return NextResponse.json({ items });
}
