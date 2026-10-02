import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SuggestedPeople } from "@/components/social/suggested-people";
import { ONBOARDING_SUGGESTIONS } from "@/lib/constants";
import { getPeopleFromYourYear } from "@/lib/queries/people";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding");
  return { title: t("step6Title"), description: t("step6Body") };
}

/**
 * Njerëzit, pasi llogaria është hapur.
 *
 * Ky ekran rri jashtë magjistarit me qëllim: hyrja mbaron kur llogaria hapet,
 * dhe ndjekja është ftesë, jo kusht. Kush e mbyll faqen këtu nuk humb asgjë,
 * sepse profili është i plotë dhe ballina e pret.
 */
export default async function WelcomePage() {
  const me = await requireUser();
  // Llogaria në shqyrtim nuk ndjek ende: shkon drejt te ballina, ku shiriti i
  // sipërm i thotë sa ka mbetur.
  if (me.awaitingReview) redirect("/feed");
  const locale = await getLocale();
  const t = await getTranslations("onboarding");

  const people = await getPeopleFromYourYear(
    {
      id: me.id,
      universityId: me.universityId,
      facultyId: me.facultyId,
      studyProgramId: me.studyProgramId,
      cohortYear: me.cohortYear,
      year: me.year,
    },
    ONBOARDING_SUGGESTIONS,
    locale,
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl text-text">{t("step6Title")}</h1>
        <p className="measure text-sm text-text-muted">{t("step6Body")}</p>
      </div>

      <SuggestedPeople people={people} emptyTitle={t("step6Empty")} />

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <Button size="lg" className="ml-auto" asChild>
          <Link href="/feed">
            {t("step6Cta")}
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
