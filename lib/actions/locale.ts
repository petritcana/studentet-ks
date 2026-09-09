"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/i18n/request";
import { succeed, type ActionState } from "./types";

export async function setLocale(locale: string): Promise<ActionState> {
  const value: Locale = LOCALES.includes(locale as Locale) ? (locale as Locale) : "sq";

  const jar = await cookies();
  jar.set(LOCALE_COOKIE, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
  return succeed();
}
