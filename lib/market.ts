export const MARKET_CATEGORIES = [
  "books",
  "notes",
  "electronics",
  "housing",
  "furniture",
  "services",
  "other",
] as const;
export type MarketCategory = (typeof MARKET_CATEGORIES)[number];

export const MARKET_CONDITIONS = ["new", "like_new", "used"] as const;
export type MarketCondition = (typeof MARKET_CONDITIONS)[number];

export const MAX_LISTING_PHOTOS = 6;

/** Sa shpallje aktive mund të ketë një person njëkohësisht. */
export const MAX_ACTIVE_LISTINGS = 15;

export const MAX_PRICE_CENTS = 1_000_000;

/** "12,50" ose "12.50" në centë. Bosh ose zero do të thotë falas. */
export function parsePrice(raw: string): number | null {
  const clean = raw.trim().replace(/\s|€/g, "").replace(",", ".");
  if (!clean) return null;
  const value = Number(clean);
  if (!Number.isFinite(value) || value < 0) return NaN;
  const cents = Math.round(value * 100);
  return cents === 0 ? null : cents;
}

export function isMarketCategory(value: unknown): value is MarketCategory {
  return typeof value === "string" && (MARKET_CATEGORIES as readonly string[]).includes(value);
}
