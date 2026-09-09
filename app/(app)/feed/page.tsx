import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Users } from "lucide-react";
import { FeedTabs } from "@/components/feed/feed-tabs";
import {
  EventUnit,
  MaterialUnit,
  PeopleUnit,
  QuestionUnit,
} from "@/components/feed/interstitials";
import { PostCard } from "@/components/feed/post-card";
import { QuickCircles } from "@/components/social/quick-circles";
import { Button } from "@/components/ui/button";
import { SkeletonPost } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getFeed, getInterstitialData, type FeedTab } from "@/lib/queries/feed";
import { getSuggestedPeople } from "@/lib/suggestions";

export const metadata: Metadata = {
  title: "Feed",
  description: "Rrjedha e përzier sociale dhe akademike e gjeneratës sate.",
};

export const dynamic = "force-dynamic";

const TABS: FeedTab[] = ["per-ty", "gjenerata", "ndjek"];

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = (TABS.includes(params.tab as FeedTab) ? params.tab : "per-ty") as FeedTab;

  return (
    <div className="flex flex-col gap-4">
      <FeedTabs active={tab} />
      <Suspense fallback={<FeedSkeleton />} key={tab}>
        <FeedStream tab={tab} />
      </Suspense>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <SkeletonPost key={index} />
      ))}
    </div>
  );
}

async function FeedStream({ tab }: { tab: FeedTab }) {
  const user = await requireUser();

  const [feed, interstitials, suggestions, following] = await Promise.all([
    getFeed(user.id, tab),
    getInterstitialData(user.id),
    getSuggestedPeople(user.id, 6),
    db.follow.findMany({ where: { followerId: user.id }, select: { followingId: true } }),
  ]);

  const followingIds = following.map((item) => item.followingId);

  if (feed.total === 0) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          illustration={tab === "ndjek" ? "people" : "feed"}
          title={
            tab === "ndjek"
              ? "Ende s'ke ndjekur askënd"
              : tab === "gjenerata"
                ? "Gjenerata jote ende s'ka postuar"
                : "Këtu është ende qetë"
          }
          description={
            tab === "ndjek"
              ? "Ndiq disa nga gjenerata jote dhe kjo rrjedhë mbushet menjëherë."
              : "Ndiq disa nga gjenerata jote dhe do të gjallërohet."
          }
          action={
            <Button asChild>
              <Link href="/kampusi">
                <Users />
                Gjej njerëz
              </Link>
            </Button>
          }
        />
        <QuickCircles />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {feed.units.map((unit, index) => {
        if (unit.kind === "post") {
          return <PostCard key={unit.post.id} post={unit.post} />;
        }
        if (unit.kind === "people") {
          return (
            <PeopleUnit
              key={`people-${index}`}
              people={suggestions}
              followingIds={followingIds}
            />
          );
        }
        if (unit.kind === "material" && interstitials.material) {
          return <MaterialUnit key={`material-${index}`} material={interstitials.material} />;
        }
        if (unit.kind === "question" && interstitials.question) {
          return <QuestionUnit key={`question-${index}`} question={interstitials.question} />;
        }
        if (unit.kind === "event" && interstitials.event) {
          return <EventUnit key={`event-${index}`} event={interstitials.event} />;
        }
        return null;
      })}

      <QuickCircles />
    </div>
  );
}
