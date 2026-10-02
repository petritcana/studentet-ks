"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { AdCard } from "@/components/ads/ad-card";
import { PostCard } from "./post-card";
import { ViewTracker } from "./view-tracker";
import {
  EventInterstitial,
  MaterialInterstitial,
  PeopleInterstitial,
  QuestionInterstitial,
  type InterstitialData,
} from "./interstitials";
import type { AdDto, PostDto } from "@/lib/dto";
import type { FeedUnit } from "@/lib/feed-ranking";

/**
 * Renderuesi i njësive të feed-it.
 *
 * Renditja dhe ndërthurja ndodhin në server (`lib/feed-ranking.ts`); këtu vetëm
 * shndërrohet një njësi në komponentin e vet. Reklama vjen si njësi e ndarë dhe
 * arrin këtu vetëm nëse `shouldSeeAds` e ka lejuar.
 */
export function FeedList({
  units,
  ad,
  interstitials,
  ownFaculty,
  onlineAuthorIds = [],
  isPro = false,
}: {
  units: FeedUnit<PostDto>[];
  ad: AdDto | null;
  /** Bosh te dhoma anonime: aty nuk hyjne as reklama, as sugjerime njerezish. */
  interstitials: InterstitialData | null;
  ownFaculty: string;
  /** Autorët që shikuesi i ndjek dhe që janë online tani. */
  onlineAuthorIds?: string[];
  /** A e ka shikuesi Pro-n: vendos veprimet te menyja e postimit. */
  isPro?: boolean;
}) {
  const t = useTranslations("feed");
  const te = useTranslations("empty");

  if (units.length === 0) {
    return (
      <EmptyState
        illustration="feed"
        title={te("feed.title")}
        description={te("feed.body")}
        action={
          <Button asChild>
            <Link href="/komuniteti">{te("feed.action")}</Link>
          </Button>
        }
      />
    );
  }

  const postIds = units.flatMap((unit) => (unit.kind === "post" ? [unit.post.id] : []));

  return (
    <div className="flex flex-col gap-4">
      {/* Pamjet numërohen kur karta hyn vërtet në ekran. */}
      <ViewTracker ids={postIds} />

      {units.map((unit, index) => {
        if (unit.kind === "post") {
          return (
            <PostCard
              key={unit.post.id}
              post={unit.post}
              ownFaculty={ownFaculty}
              isPro={isPro}
              authorOnline={
                !unit.post.author.anonymous && onlineAuthorIds.includes(unit.post.author.profile.id)
              }
            />
          );
        }
        if (unit.kind === "ad") {
          // Një reklame për pamje: kjo fshihet sapo shtylla e djathte shfaqet,
          // sepse aty vendi i sponsorizuar është tashme i dukshem.
          return ad ? (
            <div key={`ad-${index}`} className="xl:hidden">
              <AdCard ad={ad} />
            </div>
          ) : null;
        }
        if (unit.kind === "people") {
          return interstitials ? (
            <PeopleInterstitial key={`people-${index}`} people={interstitials.people} />
          ) : null;
        }
        if (unit.kind === "material") {
          return interstitials?.material ? (
            <MaterialInterstitial key={`material-${index}`} material={interstitials.material} />
          ) : null;
        }
        if (unit.kind === "question") {
          return interstitials?.question ? (
            <QuestionInterstitial key={`question-${index}`} question={interstitials.question} />
          ) : null;
        }
        return interstitials?.event ? (
          <EventInterstitial key={`event-${index}`} event={interstitials.event} />
        ) : null;
      })}

      <div className="flex flex-col items-center gap-1 py-6 text-center">
        <p className="text-sm font-medium text-text">{t("end")}</p>
        <p className="measure text-xs text-text-muted">{t("endBody")}</p>
      </div>
    </div>
  );
}
