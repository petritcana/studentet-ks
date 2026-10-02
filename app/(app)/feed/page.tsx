import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ComposerTrigger } from "@/components/feed/composer-trigger";
import { FeedList } from "@/components/feed/feed-list";
import { FeedTabs } from "@/components/feed/feed-tabs";
import { StoryRail } from "@/components/feed/story-rail";
import { PersonCard } from "@/components/social/person-card";
import { ContextRail } from "@/components/layout/context-rail";
import { PageWithRail } from "@/components/layout/page-with-rail";
import { FeedSkeleton, RailSkeleton } from "@/components/shared/page-skeleton";
import { shouldSeeAds } from "@/lib/access";
import { getFeed, getInterstitialData, pickAd, type FeedTab } from "@/lib/queries/feed";
import { getStories } from "@/lib/queries/stories";
import { getOnlineFollowedIds } from "@/lib/queries/presence";
import { requireUser } from "@/lib/session";
import { getSuggestedPeople } from "@/lib/suggestions";

/**
 * Filtrat e dukshem te feed-it.
 *
 * «Zëri i kampusit» doli nga këtu dhe jeton te Komuniteti. «Për ty» nuk është me
 * filter i dukshem: rendi social nis me ata që studenti i ndjek vertet. Renditja
 * e `për-ty` mbetet ne `lib/queries/feed.ts` dhe e përdor Eksploro.
 */
const TABS: FeedTab[] = ["ndjek", "fakulteti", "universiteti", "global"];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("feed");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [me, params, t] = await Promise.all([requireUser(), searchParams, getTranslations("feed")]);

  // Llogaria në shqyrtim nuk ndjek ende askënd: hapet te fakulteti, jo te një listë bosh.
  const fallback: FeedTab = me.awaitingReview ? "fakulteti" : "ndjek";
  const requested = (TABS.includes(params.tab as FeedTab) ? params.tab : fallback) as FeedTab;
  const tab = requested;

  /*
    Koka e faqes niset menjëherë, feed-i dhe shtylla vijnë pas.

    Serveri i prodhimit rri larg bazës, prandaj pritja e të gjitha të dhënave para
    se të dërgohet një bajt e bënte klikimin të dukej i vdekur. Me Suspense, faqja
    duket në çast dhe përmbajtja mbush vendin e vet kur të vijë.
  */
  return (
    <PageWithRail
      rail={
        <Suspense fallback={<RailSkeleton />}>
          <ContextRail page="home" user={me} />
        </Suspense>
      }
    >
      <div className="flex flex-col gap-4">
        {/*
          Ballina nis me stories dhe vazhdon me postimet.

          Rafti «Njerëz nga viti yt» u hoq nga ballina: sugjerimet e ndjekjes
          dalin një herë pas regjistrimit te `/mireseerdhe`, dhe pastaj rrinë te
          shtylla e djathtë. Ballina është për përmbajtjen, jo për një mur fytyrash
          mbi postimin e parë.
        */}
        <Suspense fallback={<div className="h-[104px]" />}>
          <StoriesSection userId={me.id} name={me.name} avatar={me.avatar} />
        </Suspense>

        <ComposerTrigger user={{ name: me.name, avatar: me.avatar }} />

        <FeedTabs active={requested} isPro={me.pro} />

        <Suspense fallback={<FeedSkeleton label={t("title")} />}>
          <FeedSection viewer={me} tab={tab} />
        </Suspense>
      </div>
    </PageWithRail>
  );
}

/** Stories, veçmas: rafti nuk duhet ta mbajë pengu tërë faqen. */
async function StoriesSection({
  userId,
  name,
  avatar,
}: {
  userId: string;
  name: string;
  avatar: string | null;
}) {
  const stories = await getStories({ id: userId });
  return <StoryRail groups={stories} me={{ id: userId, name, avatar }} />;
}

async function FeedSection({
  viewer,
  tab,
}: {
  viewer: Awaited<ReturnType<typeof requireUser>>;
  tab: FeedTab;
}) {
  const locale = await getLocale();

  const [feed, interstitialData, people, ad] = await Promise.all([
    getFeed(viewer.access, tab, locale),
    getInterstitialData(viewer.access, locale),
    getSuggestedPeople(viewer.id, 3, { locale }),
    shouldSeeAds(viewer.access) ? pickAd(viewer.access, locale) : Promise.resolve(null),
  ]);

  const t = await getTranslations("feed");

  const ownFaculty =
    (locale === "en" ? viewer.faculty?.nameEn : viewer.faculty?.name) ?? viewer.university?.abbr ?? "";

  // Pika e gjelbër vjen me një pyetje të vetme për tërë faqen, kurrë një për postim.
  const onlineAuthorIds = [
    ...(await getOnlineFollowedIds(
      viewer.id,
      feed.units.flatMap((unit) =>
        unit.kind === "post" && !unit.post.author.anonymous ? [unit.post.author.profile.id] : [],
      ),
    )),
  ];

  if (tab === "ndjek" && feed.units.length === 0) {
    /*
      Kjo eshte faqja e pare e nje studenti te ri, sepse «Duke ndjekur» eshte tani
      parazgjedhja. Prandaj ketu dalin njerez te vertete nga viti i tij.
    */
    return (
      <div className="flex flex-col gap-3">
        <EmptyState illustration="people" title={t("followingEmpty")} description={t("followingEmptyBody")} />

        {people.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-text">{t("followingEmptyPeople")}</h2>
            {people.map((person) => (
              <PersonCard key={person.id} person={person} compact />
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/komuniteti">{t("followingEmptyExplore")}</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/komuniteti">{t("followingEmptyGroups")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <FeedList
      units={feed.units}
      ad={ad}
      interstitials={{ ...interstitialData, people }}
      ownFaculty={ownFaculty}
      onlineAuthorIds={onlineAuthorIds}
      isPro={viewer.pro}
    />
  );
}
