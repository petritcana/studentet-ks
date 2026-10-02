import { cache } from "react";
import { db } from "@/lib/db";
import { acceptedFollow } from "@/lib/follow";

/**
 * Kush e ndjek kush, një herë për kërkesë.
 *
 * Të njëjtën listë e donin feed-i, stories, prania dhe renditja, secili me
 * pyetjen e vet. Kjo do të thoshte katër udhëtime deri te baza për të njëjtën
 * përgjigje, dhe në prodhim çdo udhëtim kushton rreth njëqind milisekonda.
 * `cache` e mban rezultatin sa zgjat kërkesa, prandaj pyetja bëhet një herë.
 */
export const getFollowing = cache(async (userId: string) => {
  const rows = await db.follow.findMany({
    where: { followerId: userId, ...acceptedFollow },
    select: { followingId: true, isMutual: true },
  });

  return {
    rows,
    ids: rows.map((row) => row.followingId),
    mutualIds: rows.filter((row) => row.isMutual).map((row) => row.followingId),
  };
});

/** Kush është bllokuar ose heshtur nga ky përdorues, një herë për kërkesë. */
export const getHiddenPeople = cache(async (userId: string) => {
  const rows = await db.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true, kind: true },
  });

  const blockedByMe = new Set<string>();
  const blockedMe = new Set<string>();
  for (const row of rows) {
    if (row.blockerId === userId) blockedByMe.add(row.blockedId);
    else blockedMe.add(row.blockerId);
  }

  return { blockedByMe, blockedMe, all: new Set([...blockedByMe, ...blockedMe]) };
});
