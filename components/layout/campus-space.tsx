import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SideJobs } from "./side-jobs";

/**
 * Pjesa e poshtme e shtyllës së majtë, nën navigim.
 *
 * Njoftimet tona dhe reklama kaluan në shtyllën e djathtë, ku studenti i sheh
 * krah feed-it. Majtas mbeten vetëm mundësitë e punës.
 */
export function CampusSpace({
  user,
}: {
  user: { id: string; facultyId: string | null; city: string | null };
}) {
  return <SideJobs user={user} />;
}

/** Skeleti i kartës së punëve, në formën e saj: titull dhe tri rreshta me pllakë. */
export function CampusSpaceSkeleton() {
  return (
    <Card className="flex flex-col gap-3 p-[18px]" aria-hidden>
      <Skeleton className="h-5 w-32" />
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex items-start gap-3 px-2.5 py-1.5">
          <Skeleton className="size-9 shrink-0 rounded-[11px]" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </Card>
  );
}
