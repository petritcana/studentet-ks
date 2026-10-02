import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Ilustrime të vogla, abstrakte, të ndërtuara nga tokenat. Pa asete të jashtme,
 * punojnë njësoj në dritë dhe errësirë sepse marrin currentColor.
 */
const ILLUSTRATIONS = {
  feed: (
    <>
      <rect x="10" y="18" width="60" height="10" rx="5" className="fill-current opacity-15" />
      <rect x="10" y="34" width="44" height="10" rx="5" className="fill-current opacity-25" />
      <rect x="10" y="50" width="52" height="10" rx="5" className="fill-current opacity-15" />
      <circle cx="66" cy="55" r="12" className="fill-current opacity-40" />
    </>
  ),
  materials: (
    <>
      <rect x="14" y="14" width="40" height="52" rx="6" className="fill-current opacity-15" />
      <rect x="26" y="20" width="40" height="52" rx="6" className="fill-current opacity-30" />
      <rect x="34" y="32" width="24" height="4" rx="2" className="fill-current opacity-60" />
      <rect x="34" y="42" width="18" height="4" rx="2" className="fill-current opacity-40" />
    </>
  ),
  people: (
    <>
      <circle cx="28" cy="30" r="11" className="fill-current opacity-30" />
      <path d="M10 66c0-10 8-17 18-17s18 7 18 17z" className="fill-current opacity-20" />
      <circle cx="56" cy="34" r="9" className="fill-current opacity-45" />
      <path d="M42 66c0-8 6-14 14-14s14 6 14 14z" className="fill-current opacity-25" />
    </>
  ),
  messages: (
    <>
      <rect x="8" y="16" width="50" height="34" rx="10" className="fill-current opacity-20" />
      <path d="M20 50l-2 12 14-12z" className="fill-current opacity-20" />
      <rect x="34" y="34" width="38" height="26" rx="9" className="fill-current opacity-45" />
      <path d="M62 60l3 9-11-9z" className="fill-current opacity-45" />
    </>
  ),
  search: (
    <>
      <circle cx="35" cy="35" r="20" className="fill-current opacity-15" />
      <circle cx="35" cy="35" r="20" className="stroke-current opacity-45" strokeWidth="3" fill="none" />
      <rect
        x="50"
        y="50"
        width="22"
        height="6"
        rx="3"
        transform="rotate(45 50 50)"
        className="fill-current opacity-45"
      />
    </>
  ),
  calendar: (
    <>
      <rect x="12" y="20" width="56" height="48" rx="8" className="fill-current opacity-15" />
      <rect x="12" y="20" width="56" height="12" rx="6" className="fill-current opacity-40" />
      <rect x="22" y="12" width="6" height="14" rx="3" className="fill-current opacity-55" />
      <rect x="52" y="12" width="6" height="14" rx="3" className="fill-current opacity-55" />
      <circle cx="28" cy="44" r="4" className="fill-current opacity-45" />
      <circle cx="40" cy="44" r="4" className="fill-current opacity-30" />
      <circle cx="52" cy="44" r="4" className="fill-current opacity-30" />
    </>
  ),
  bell: (
    <>
      <path
        d="M40 14c-9 0-16 7-16 16v12l-6 10h44l-6-10V30c0-9-7-16-16-16z"
        className="fill-current opacity-20"
      />
      <path d="M32 56a8 8 0 0 0 16 0z" className="fill-current opacity-45" />
      <circle cx="40" cy="12" r="4" className="fill-current opacity-55" />
    </>
  ),
} as const;

export type EmptyIllustration = keyof typeof ILLUSTRATIONS;

/** Asnjë ekran bosh pa udhëzim. Një fjali njerëzore dhe një veprim i qartë. */
export function EmptyState({
  illustration = "feed",
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: {
  illustration?: EmptyIllustration;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface/60 text-center",
        compact ? "gap-3 px-4 py-8" : "gap-4 px-6 py-12",
        className,
      )}
    >
      <svg
        viewBox="0 0 80 80"
        className={cn("text-brand-500", compact ? "size-14" : "size-20")}
        aria-hidden
        focusable="false"
      >
        {ILLUSTRATIONS[illustration]}
      </svg>

      <div className="flex max-w-sm flex-col gap-1.5">
        <p className="text-base font-semibold text-text">{title}</p>
        {description ? <p className="text-pretty text-sm text-text-muted">{description}</p> : null}
      </div>

      {action || secondaryAction ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
