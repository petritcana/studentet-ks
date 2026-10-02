import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LoginScreen } from "@/components/auth/login-screen";
import { isDemoMode, isGoogleEnabled } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("loginCta"), description: t("loginBody") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await getCurrentUser();
  if (user?.onboardedAt) redirect("/feed");
  if (user) redirect("/regjistrohu");

  return (
    <div className="mx-auto w-full max-w-[500px] px-5 pb-16 pt-8 min-[560px]:pt-14">
      <LoginScreen
        googleEnabled={isGoogleEnabled}
        demoEnabled={isDemoMode}
        // NextAuth kthen këtu me `?error=` kur Google refuzon ose lidhja dështon.
        oauthError={error ? (error === "AccessDenied" ? "denied" : "failed") : null}
      />
    </div>
  );
}
