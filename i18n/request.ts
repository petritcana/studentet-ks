import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, TIME_ZONE, resolveLocale } from "./config";

export default getRequestConfig(async () => {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: TIME_ZONE,
  };
});
