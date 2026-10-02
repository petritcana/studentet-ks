"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Shenja e verifikimit: rreth i mbushur me ngjyrën e markës plus shenjë
 * kontrolli. Do të thotë **email institucional i verifikuar**, asgjë tjetër.
 * Nuk nënkupton Pro dhe nuk nënkupton status.
 */
export function VerifiedMark({
  size = "md",
  withTooltip = true,
  className,
}: {
  size?: "sm" | "md" | "lg";
  withTooltip?: boolean;
  className?: string;
}) {
  const t = useTranslations("identity");

  const dimensions = {
    sm: { box: "size-3.5", icon: "size-2" },
    md: { box: "size-4", icon: "size-2.5" },
    lg: { box: "size-5", icon: "size-3" },
  }[size];

  const mark = (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full bg-brand-500 text-brand-contrast",
        dimensions.box,
        className,
      )}
    >
      <Check className={dimensions.icon} strokeWidth={3.5} aria-hidden />
      <span className="sr-only">{t("verifiedLabel")}</span>
    </span>
  );

  if (!withTooltip) return mark;

  return (
    <Tooltip label={t("verifiedTooltip")}>
      <span className="inline-flex">{mark}</span>
    </Tooltip>
  );
}
