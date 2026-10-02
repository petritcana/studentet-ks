export const LOCALES = ["sq", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Shqipja është gjuha e produktit. Anglishtja është e plotë, jo e pjesshme. */
export const DEFAULT_LOCALE: Locale = "sq";

/**
 * Gjuha ruhet në cookie dhe në profilin e përdoruesit. Rrugët nuk përkthehen,
 * kështu që një link i ndarë funksionon njësoj në të dyja gjuhët. Vetëm faqet
 * publike të marketingut marrin prefiksin `/en/`, për SEO.
 */
export const LOCALE_COOKIE = "gjuha";
export const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

export const TIME_ZONE = "Europe/Belgrade";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
