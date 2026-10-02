"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, LOCALE_MAX_AGE, resolveLocale } from "@/i18n/config";

/**
 * Gjuha ruhet në cookie. Në Fazën 3, kur ekziston llogaria, e njëjta zgjedhje
 * shkruhet edhe te `User.locale`, që të ndjekë përdoruesin në çdo pajisje.
 */
export async function setLocale(value: string) {
  const locale = resolveLocale(value);

  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_MAX_AGE,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
