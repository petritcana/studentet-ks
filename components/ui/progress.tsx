"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { useTranslations } from "next-intl";
import { cn, clamp } from "@/lib/utils";

export const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    value?: number;
    tone?: "brand" | "accent" | "success" | "pro";
    size?: "sm" | "md";
  }
>(function Progress({ className, value = 0, tone = "brand", size = "md", ...props }, ref) {
  const clamped = clamp(value, 0, 100);

  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={clamped}
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-surface-2",
        size === "sm" ? "h-1.5" : "h-2.5",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 rounded-full transition-transform duration-400 ease-brand",
          tone === "brand" && "bg-brand-500",
          tone === "accent" && "bg-accent-500",
          tone === "success" && "bg-success",
          tone === "pro" && "pro-gradient",
        )}
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});

/** Progres i hapave në onboarding. */
export function StepProgress({
  current,
  total,
  className,
}: {
  current: number;
  total: number;
  className?: string;
}) {
  const t = useTranslations("common");

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between text-xs text-text-muted">
        <span>
          {t("step")} <span className="tabular text-text">{current}</span> {t("of")}{" "}
          <span className="tabular text-text">{total}</span>
        </span>
        <span className="tabular">{Math.round((current / total) * 100)}%</span>
      </div>
      <Progress value={(current / total) * 100} size="sm" />
    </div>
  );
}
