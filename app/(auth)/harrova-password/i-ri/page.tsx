import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { AuthHeading } from "@/components/auth/auth-ui";
import { ResetScreen } from "@/components/auth/reset-screen";
import { RESET_PASS_COOKIE, isResetPassUsable } from "@/lib/password-reset";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("authFlow");
  return { title: t("resetTitle") };
}

export const dynamic = "force-dynamic";

/**
 * Kthimi nga Google në rrugën e password-it të harruar. Hapet vetëm me lejen
 * e nënshkruar që lëshoi Google për këtë llogari (dhjetë minuta); pa të,
 * studenti kthehet te «Ke harruar password-in?».
 */
export default async function NewPasswordPage() {
  const [me, jar, t] = await Promise.all([getCurrentUser(), cookies(), getTranslations("authFlow")]);
  const allowed = Boolean(me && (await isResetPassUsable(jar.get(RESET_PASS_COOKIE)?.value, me.id)));

  return (
    <div className="mx-auto w-full max-w-[500px] px-5 pb-16 pt-8 min-[560px]:pt-14">
      {allowed && me ? (
        <ResetScreen mode="google" name={me.name} />
      ) : (
        <div data-auth-screen="reset-expired">
          <AuthHeading title={t("resetExpiredTitle")} lead={t("resetGoogleExpiredLead")} />
          <Link href="/harrova-password" className="text-sm font-bold text-brand-500 hover:underline">
            {t("resetAgain")}
          </Link>
        </div>
      )}
    </div>
  );
}
