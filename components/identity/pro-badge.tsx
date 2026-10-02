"use client";

import { useTranslations } from "next-intl";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Shenja e Pro-s. Gradient nga marka te theksi, shkronja të mëdha, 10px.
 *
 * Shfaqet vetëm kur `isPro(user)` kthen true. Nuk ka të bëjë me verifikimin e
 * emailit, që është shenjë tjetër dhe kuptim tjetër.
 */
export function ProBadge({
  size = "md",
  withTooltip = true,
  className,
}: {
  size?: "sm" | "md";
  withTooltip?: boolean;
  className?: string;
}) {
  const t = useTranslations("identity");

  const badge = (
    <span
      className={cn(
        "pro-gradient inline-flex shrink-0 items-center rounded-[6px] font-extrabold uppercase text-pro-contrast",
        size === "sm"
          ? "px-1.5 py-px text-[9px] tracking-[0.06em]"
          : "px-[7px] py-0.5 text-[10px] tracking-[0.06em]",
        className,
      )}
    >
      {t("proLabel")}
    </span>
  );

  if (!withTooltip) return badge;

  return (
    <Tooltip label={t("proTooltip")}>
      <span className="inline-flex">{badge}</span>
    </Tooltip>
  );
}
