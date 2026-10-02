/**
 * Ndjekja dhe profilet private.
 *
 * Një profil privat nuk e ndryshon grafin: ndjekja mbetet e njëjta lidhje, por
 * hyn me `status: "pending"` derisa pronari ta pranojë. Çdo pyetje që numëron
 * ndjekës ose lexon përmbajtje e filtron statusin, prandaj filtri jeton këtu,
 * në një vend të vetëm, dhe kurrë i shkruar me dorë nëpër query.
 */

export const FOLLOW_ACCEPTED = "accepted";
export const FOLLOW_PENDING = "pending";
export const FOLLOW_DECLINED = "declined";

/** Filtri i vetëm i lejuar për ndjekje të vërteta. */
export const acceptedFollow = { status: FOLLOW_ACCEPTED } as const;

export type FollowState = "none" | "pending" | "declined" | "following" | "friends";

export function followStateOf(follow: { status: string; isMutual: boolean } | null): FollowState {
  if (!follow) return "none";
  if (follow.status === FOLLOW_PENDING) return "pending";
  if (follow.status === FOLLOW_DECLINED) return "declined";
  return follow.isMutual ? "friends" : "following";
}

/**
 * A mund ta shohë shikuesi përmbajtjen e këtij profili.
 *
 * Profili publik hapet për çdo student të kyçur. Profili privat hapet vetëm për
 * vetë pronarin dhe për ndjekësit e pranuar. Kjo vendos edhe për postimet, edhe
 * për median, edhe për stories.
 */
export function canViewProfileContent(input: {
  viewerId: string;
  ownerId: string;
  ownerIsPrivate: boolean;
  viewerFollowState: FollowState;
}): boolean {
  if (input.viewerId === input.ownerId) return true;
  if (!input.ownerIsPrivate) return true;
  return input.viewerFollowState === "following" || input.viewerFollowState === "friends";
}
