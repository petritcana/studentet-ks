"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export type MentionSuggestion = { username: string; name: string; avatar: string | null };

/**
 * Sugjerimet për @: njerëzit me këtë fillim te username-i ose te emri. Pa
 * shkronja dalin ata që ndjek. Kush e ka bllokuar studentin, ose e ka bllokuar
 * ai, nuk del.
 */
export async function suggestMentions(prefix: string): Promise<MentionSuggestion[]> {
  const me = await requireUser();
  const value = prefix.trim().toLowerCase().slice(0, 30);

  const blocks = await db.userBlock.findMany({
    where: { OR: [{ blockerId: me.id }, { blockedId: me.id }] },
    select: { blockerId: true, blockedId: true },
  });
  const hidden = [...new Set([me.id, ...blocks.flatMap((row) => [row.blockerId, row.blockedId])])];

  if (!value) {
    const follows = await db.follow.findMany({
      where: { followerId: me.id, status: "accepted", followingId: { notIn: hidden } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { following: { select: { username: true, name: true, avatar: true } } },
    });
    return follows.map((row) => row.following);
  }

  const title = value.charAt(0).toUpperCase() + value.slice(1);
  return db.user.findMany({
    where: {
      id: { notIn: hidden },
      OR: [{ username: { startsWith: value } }, { name: { startsWith: value } }, { name: { startsWith: title } }, { name: { contains: ` ${title}` } }],
    },
    orderBy: { followers: { _count: "desc" } },
    take: 6,
    select: { username: true, name: true, avatar: true },
  });
}
