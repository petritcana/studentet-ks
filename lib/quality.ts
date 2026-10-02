export const VERIFICATION_STATES = ["pending", "community", "verified", "rejected"] as const;
export type VerificationState = (typeof VERIFICATION_STATES)[number];

/** Sa vleresime pozitive e ngrejne një material te "i shqyrtuar nga komuniteti". */
export const COMMUNITY_THRESHOLD = 3;
/** Cka konsiderohet vleresim pozitiv. */
export const POSITIVE_RATING = 4;
/** Nen këtë mesatare, me kaq vleresime, materiali hiqet vetë. */
export const AUTO_REMOVE_RATING = 2;
export const AUTO_REMOVE_MIN_RATINGS = 5;

export type QualitySignals = {
  status: VerificationState;
  rating: number;
  ratingCount: number;
  positiveCount: number;
  /** A e ka parë një moderator ose profesor. */
  reviewedByStaff: boolean;
};

export type QualityDecision = {
  status: VerificationState;
  /** Arsyeja, si celes perkthimi. Kurrë tekst i gatshem. */
  reason: "staff" | "community" | "low_rating" | "unchanged";
};

/**
 * Gjendja që i takon një materiali tani.
 *
 * Rendi ka rendesi: heqja automatike fiton mbi gjithcka, sepse një material i
 * keq që mban shenjen e komunitetit është me i demshem se një pa shenje fare.
 */
export function decideQuality(signals: QualitySignals): QualityDecision {
  if (
    signals.ratingCount >= AUTO_REMOVE_MIN_RATINGS &&
    signals.rating > 0 &&
    signals.rating < AUTO_REMOVE_RATING
  ) {
    return { status: "rejected", reason: "low_rating" };
  }

  if (signals.reviewedByStaff) return { status: "verified", reason: "staff" };

  // Një material i verifikuar nuk bie mbrapsht te "komunitet" sepse erdhi një
  // vleresim i ri: vendimi i njeriut peshon me shumë se numrat.
  if (signals.status === "verified") return { status: "verified", reason: "unchanged" };

  if (signals.positiveCount >= COMMUNITY_THRESHOLD) {
    return { status: "community", reason: "community" };
  }

  return { status: signals.status === "rejected" ? "rejected" : "pending", reason: "unchanged" };
}

/** A duhet fshehur materiali nga listat. Vetëm i refuzuari fshihet. */
export function isHiddenState(status: VerificationState) {
  return status === "rejected";
}

export const QUALITY_ORDER: Record<VerificationState, number> = {
  verified: 0,
  community: 1,
  pending: 2,
  rejected: 3,
};
