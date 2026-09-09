import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Skeleton, kurrë spinner. Forma duhet t'i përgjigjet përmbajtjes reale që
 * po pritet, jo një drejtkëndëshi gjenerik.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("shimmer rounded-sm bg-surface-2", className)}
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3.5", index === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Forma e një postimi në feed. */
export function SkeletonPost({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-surface p-4", className)}
      role="status"
      aria-label="Duke ngarkuar postimin"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <SkeletonText className="mt-4" lines={3} />
      <div className="mt-4 flex gap-4">
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>
    </div>
  );
}

/** Forma e një karte materiali. */
export function SkeletonMaterial({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-surface p-4", className)}
      role="status"
      aria-label="Duke ngarkuar materialin"
    >
      <div className="flex items-start gap-3">
        <Skeleton className="size-11 rounded-md" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-1/2" />
          <div className="mt-1 flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Forma e një rreshti personi në listë ose sugjerime. */
export function SkeletonPerson({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-center gap-3", className)}
      role="status"
      aria-label="Duke ngarkuar profilin"
    >
      <Skeleton className="size-10 rounded-full" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton className="h-8 w-20 rounded-full" />
    </div>
  );
}
