import "server-only";

import { db } from "@/lib/db";
import { acceptedFollow } from "@/lib/follow";

/**
 * Kush mund të të ndjekë, dhe kush mund të të shkruajë.
 *
 * Këto janë cilësime që ndryshojnë vërtet sjelljen, prandaj vendimi merret në
 * një vend të vetëm dhe thirret nga çdo veprim që i prek. Një cilësim që vetëm
 * duket do të ishte më keq se mungesa e tij: studenti do të besonte se është i
 * mbrojtur kur nuk është.
 */

type Target = {
  id: string;
  whoCanFollow: string;
  whoCanMessage: string;
  universityId: string | null;
};

type Viewer = {
  id: string;
  verification: string;
  universityId: string | null;
};

async function areFriends(a: string, b: string) {
  const both = await db.follow.count({
    where: {
      ...acceptedFollow,
      OR: [
        { followerId: a, followingId: b },
        { followerId: b, followingId: a },
      ],
    },
  });
  return both === 2;
}

/** A lejohet `viewer` ta ndjekë `target`. */
export async function canFollow(viewer: Viewer, target: Target): Promise<boolean> {
  switch (target.whoCanFollow) {
    case "nobody":
      return false;
    case "verified":
      return viewer.verification === "verified";
    case "university":
      return Boolean(target.universityId) && viewer.universityId === target.universityId;
    default:
      return true;
  }
}

/** A lejohet `viewer` t'i shkruajë `target`. */
export async function canMessage(viewer: Viewer, target: Target): Promise<boolean> {
  switch (target.whoCanMessage) {
    case "nobody":
      return false;
    case "friends":
      return areFriends(viewer.id, target.id);
    case "university":
      return Boolean(target.universityId) && viewer.universityId === target.universityId;
    default:
      return true;
  }
}

/** Të dhënat minimale që i duhen vendimit, për kë po pyetet. */
export function audienceSelect() {
  return { id: true, whoCanFollow: true, whoCanMessage: true, universityId: true } as const;
}
