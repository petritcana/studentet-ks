import { Skeleton, SkeletonPost } from "@/components/ui/skeleton";

/** Skeleton, kurrë spinner. Forma i përgjigjet asaj që po vjen. */
export default function AppLoading() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Duke ngarkuar">
      <Skeleton className="h-9 w-56 rounded-full" />
      <Skeleton className="h-4 w-72" />
      {Array.from({ length: 3 }).map((_, index) => (
        <SkeletonPost key={index} />
      ))}
    </div>
  );
}
