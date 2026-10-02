import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CareerProfileForm } from "@/components/jobs/career-profile-form";
import { getMyCareerProfile } from "@/lib/actions/career";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("career");
  return { title: t("profileTitle"), robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

export default async function CareerProfilePage() {
  const [, profile, t] = await Promise.all([
    requireUser(),
    getMyCareerProfile(),
    getTranslations("career"),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text">{t("profileTitle")}</h1>
        <p className="measure text-sm text-text-muted">{t("profileBody")}</p>
      </header>

      <CareerProfileForm
        initial={{
          visibility: profile?.visibility ?? "private",
          headline: profile?.headline ?? "",
          summary: profile?.summary ?? "",
          skills: profile?.skills ?? [],
          languages: profile?.languages ?? [],
          desiredRoles: profile?.desiredRoles ?? [],
          preferredCity: profile?.preferredCity ?? "",
          portfolioUrl: profile?.portfolioUrl ?? "",
          openToWork: profile?.openToWork ?? false,
        }}
      />
    </div>
  );
}
