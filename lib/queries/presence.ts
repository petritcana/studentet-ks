import { db } from "@/lib/db";
import { onlineSince, presenceStatus } from "@/lib/presence";
import { getFollowing } from "./social-graph";

/**
 * Kush nga këta autorë është online tani, për shikuesin.
 *
 * Pika e gjelbër shfaqet vetëm te njerëzit që shikuesi i ndjek vërtet, dhe
 * vetëm kur ata e kanë lënë statusin të dukshëm. Një pyetje e vetme për tërë
 * faqen, kurrë një kërkesë për postim.
 */
export async function getOnlineFollowedIds(viewerId: string, authorIds: string[]): Promise<Set<string>> {
  const unique = [...new Set(authorIds)].filter((id) => id !== viewerId);
  if (unique.length === 0) return new Set();

  // Lista e ndjekjeve vjen nga kujtesa e kërkesës; këtu mbetet vetëm kush është
  // online tani, me një pyetje të vetme mbi përdoruesit.
  const following = new Set((await getFollowing(viewerId)).ids);
  const candidates = unique.filter((id) => following.has(id));
  if (candidates.length === 0) return new Set();

  const rows = await db.user.findMany({
    where: { id: { in: candidates }, showOnlineStatus: true, lastSeenAt: { gte: onlineSince() } },
    select: { id: true },
  });

  return new Set(rows.map((row) => row.id));
}

/**
 * Prania e një personi të vetëm, e filtruar nga cilësimet e tij.
 *
 * Përdoret te profili dhe te koka e bisedës. Kthen `null` kur personi e ka fikur
 * statusin, që thirrësi të mos shfaqë asgjë në vend të një pike gri që të bën
 * pyetje.
 */
export async function getPresence(userId: string) {
  const person = await db.user.findUnique({
    where: { id: userId },
    select: { lastSeenAt: true, showOnlineStatus: true, showLastActive: true },
  });

  if (!person || !person.showOnlineStatus) return null;

  return {
    status: presenceStatus(person.lastSeenAt),
    lastSeenAt: person.showLastActive ? person.lastSeenAt : null,
  };
}
