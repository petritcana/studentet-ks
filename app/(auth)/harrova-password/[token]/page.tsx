import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ResetScreen } from "@/components/auth/reset-screen";
import { AuthHeading } from "@/components/auth/auth-ui";
import { findValidReset } from "@/lib/password-reset";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("authFlow");
  return { title: t("resetTitle") };
}

export const dynamic = "force-dynamic";

/** Lidhja nga emaili ose nga admini: password i ri, ose shpjegim kur lidhja s'vlen më. */
export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [reset, t] = await Promise.all([findValidReset(token), getTranslations("authFlow")]);

  return (
    <div className="mx-auto w-full max-w-[500px] px-5 pb-16 pt-8 min-[560px]:pt-14">
      {reset ? (
        <ResetScreen token={token} name={reset.user.name} />
      ) : (
        <div data-auth-screen="reset-expired">
          <AuthHeading title={t("resetExpiredTitle")} lead={t("resetExpiredLead")} />
          <Link href="/harrova-password" className="text-sm font-bold text-brand-500 hover:underline">
            {t("resetAgain")}
          </Link>
        </div>
      )}
    </div>
  );
}
