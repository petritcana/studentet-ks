import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const LOCALES = ["sq", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "sq";
export const LOCALE_COOKIE = "gjuha";

/**
 * Gjuha vjen nga një cookie, jo nga prefiksi i URL-së. Rrugët janë në shqip dhe
 * mbeten të njëjta për të dyja gjuhët, kështu që linqet e ndara nuk prishen kur
 * dikush e ndërron gjuhën.
 */
export default getRequestConfig(async () => {
  const jar = await cookies();
  const requested = jar.get(LOCALE_COOKIE)?.value;
  const locale: Locale = LOCALES.includes(requested as Locale)
    ? (requested as Locale)
    : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: "Europe/Belgrade",
    now: new Date(),
  };
});
