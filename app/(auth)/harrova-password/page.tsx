import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ForgotScreen } from "@/components/auth/forgot-screen";
import { isGoogleEnabled } from "@/lib/auth";
import { mailIsLive } from "@/lib/email";
import { RESET_MINUTES } from "@/lib/password-reset";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("authFlow");
  return { title: t("forgotTitle") };
}

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ gabim?: string }> }) {
  const { gabim } = await searchParams;
  return (
    <div className="mx-auto w-full max-w-[500px] px-5 pb-16 pt-8 min-[560px]:pt-14">
      <ForgotScreen googleEnabled={isGoogleEnabled} mailLive={mailIsLive()} minutes={RESET_MINUTES} error={gabim ?? null} />
    </div>
  );
}
