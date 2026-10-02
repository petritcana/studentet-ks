import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonPost } from "@/components/ui/skeleton";

/**
 * Forma e faqes derisa serveri përgjigjet.
 *
 * Kurrë spinner: skeletoni ka formën e përmbajtjes së vërtetë, prandaj studenti
 * e sheh menjëherë ku do të dalë çfarë, dhe klikimi nuk duket i humbur. Kjo është
 * e vetmja gjë që e bën pritjen e serverit të durueshme.
 */
export function PageSkeleton({
  label,
  kind = "feed",
}: {
  label: string;
  kind?: "feed" | "list" | "grid" | "detail";
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>

      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72" />

      {kind === "feed" ? (
        <>
          <Skeleton className="h-12 w-full rounded-xl" />
          {[0, 1, 2].map((index) => (
            <SkeletonPost key={index} label={label} />
          ))}
        </>
      ) : null}

      {kind === "list" ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((index) => (
            <Card key={index} className="flex items-center gap-3 p-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {kind === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Card key={index} className="flex flex-col gap-2 p-0">
              <Skeleton className="aspect-[4/3] w-full rounded-none rounded-t-lg" />
              <div className="flex flex-col gap-1.5 p-3">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {kind === "detail" ? (
        <Card className="flex flex-col gap-3 p-4">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </Card>
      ) : null}
    </div>
  );
}

/** Vetëm postimet, kur pjesa tjetër e faqes ka ardhur tashmë. */
export function FeedSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((index) => (
        <SkeletonPost key={index} label={label} />
      ))}
    </div>
  );
}

/** Shtylla e djathtë derisa kartat e saj vijnë. */
export function RailSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {[0, 1].map((index) => (
        <Card key={index} className="flex flex-col gap-2 p-4">
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </Card>
      ))}
    </div>
  );
}
