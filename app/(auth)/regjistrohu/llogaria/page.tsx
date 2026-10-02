import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AccountSetup } from "@/components/auth/account-setup";
import { isGoogleEnabled } from "@/lib/auth";
import { DEMO_GOOGLE_PROFILE } from "@/lib/auth-demo";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isInstitutionalEmail } from "@/lib/types";
import { normalizeUsername, usernameBaseFromFullName } from "@/lib/username";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("authFlow");
  return { title: t("setupTitle") };
}

/**
 * «Krijo llogarinë tënde», pas hapit me Google.
 *
 * Me Google të lidhur, studenti vjen këtu nga Google me llogarinë e krijuar dhe
 * emailin e konfirmuar. Vendos password-in e platformës dhe vazhdon te
 * onboarding-u ekzistues. Kush e ka password-in tashmë, ose e ka mbaruar
 * onboarding-un, kalon drejt. Pa Google të lidhur, faqja mbetet demonstruese.
 */
export default async function AccountSetupPage() {
  const user = await getCurrentUser();
  if (user?.onboardedAt) redirect("/feed");

  if (!user) {
    // Me Google të lidhur, kjo faqe hapet vetëm pas Google-it.
    if (isGoogleEnabled) redirect("/regjistrohu");
    return (
      <div className="mx-auto w-full max-w-[580px] px-5 pb-16 pt-8 min-[560px]:pt-14">
        <AccountSetup profile={DEMO_GOOGLE_PROFILE} verifiedStudent nextHref={null} />
      </div>
    );
  }

  const record = await db.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, username: true, passwordHash: true },
  });
  if (!record) redirect("/regjistrohu");
  if (record.passwordHash) redirect("/regjistrohu");

  return (
    <div className="mx-auto w-full max-w-[580px] px-5 pb-16 pt-8 min-[560px]:pt-14">
      <AccountSetup
        profile={{ name: record.name, email: record.email }}
        verifiedStudent={isInstitutionalEmail(record.email)}
        username={{ base: normalizeUsername(usernameBaseFromFullName(record.name, record.email)), username: record.username }}
        nextHref="/regjistrohu"
        live
      />
    </div>
  );
}
