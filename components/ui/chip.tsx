"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Chip = pilulë e zgjedhshme. Ndryshe nga Badge, është kontroll, jo etiketë.
 * Përdoret te interesat, filtrat dhe tagat e lëndëve.
 */
export function Chip({
  children,
  selected = false,
  onRemove,
  removeLabel,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={onRemove ? undefined : selected}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium",
        "transition-all duration-150 ease-brand active:scale-[0.97]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        selected
          ? "border-brand-500 bg-brand-500/12 text-brand-500"
          : "border-border bg-surface text-text-muted hover:border-text-muted/50 hover:text-text",
        className,
      )}
      {...props}
    >
      {children}
      {onRemove ? (
        <span
          role="button"
          tabIndex={-1}
          aria-label={removeLabel}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="-mr-1 rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100"
        >
          <X className="size-3" />
        </span>
      ) : null}
    </button>
  );
}

export function ChipGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-wrap gap-2", className)} {...props} />;
}
