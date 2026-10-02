/** Ndarja e parazgjedhur. Mund te mbivendoset për instruktor ose fushate. */
export const DEFAULT_INSTRUCTOR_SHARE = Number(process.env.INSTRUCTOR_SHARE ?? "0.7");

/** Pragu minimal për një kërkesë terheqjeje, ne cent. */
export const PAYOUT_MINIMUM_CENTS = Number(process.env.PAYOUT_MINIMUM_CENTS ?? "5000");

/** Sa ditë ka studenti për te kerkuar kthim parash. */
export const REFUND_WINDOW_DAYS = Number(process.env.REFUND_WINDOW_DAYS ?? "14");

export type Split = {
  grossCents: number;
  platformCents: number;
  instructorCents: number;
  providerCents: number;
};

/**
 * Ndarja e një shitjeje.
 *
 * Tarifa e ofruesit hiqet nga bruto para ndarjes, sepse ate e paguan shitja, jo
 * njera pale. Rrumbullakosja i shkon platformes, që shuma e pjeseve te jete
 * gjithmonë saktesisht bruto: një cent i humbur për shitje behet para e vërtetë.
 */
export function splitSale(
  grossCents: number,
  options: { instructorShare?: number; providerCents?: number } = {},
): Split {
  const share = options.instructorShare ?? DEFAULT_INSTRUCTOR_SHARE;
  const providerCents = Math.max(0, Math.round(options.providerCents ?? 0));
  const gross = Math.max(0, Math.round(grossCents));

  const net = Math.max(0, gross - providerCents);
  const instructorCents = Math.floor(net * share);
  const platformCents = net - instructorCents;

  return { grossCents: gross, platformCents, instructorCents, providerCents };
}

/** Kthimi i parave e kthen mbrapsht te njejten ndarje, me shenje negative. */
export function reverseSplit(split: Split): Split {
  return {
    grossCents: -split.grossCents,
    platformCents: -split.platformCents,
    instructorCents: -split.instructorCents,
    providerCents: -split.providerCents,
  };
}

/** A është ende brenda dritares se kthimit. */
export function withinRefundWindow(purchasedAt: Date, now: Date = new Date()) {
  return now.getTime() - purchasedAt.getTime() <= REFUND_WINDOW_DAYS * 86_400_000;
}

/** Sa mund te terheqe instruktori tani, nga rreshtat e librit. */
export function availableBalance(
  entries: { kind: string; instructorCents: number }[],
): number {
  return entries.reduce((sum, entry) => {
    if (entry.kind === "payout") return sum - Math.abs(entry.instructorCents);
    return sum + entry.instructorCents;
  }, 0);
}

export function canRequestPayout(balanceCents: number) {
  return balanceCents >= PAYOUT_MINIMUM_CENTS;
}
