"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Parapamje, jo padukshmëri.
 *
 * Përmbajtja jashtë rrethit të përdoruesit nuk fshihet: shfaqet me blur, me
 * titullin dhe metadatat të lexueshme sipër, dhe me një arsye konkrete pse është
 * e kyçur. Dëshira lind nga ajo që e sheh por s'e ke.
 */
export function LockedOverlay({
  title,
  body,
  onUnlock,
  children,
  className,
  intensity = "md",
}: {
  /** Arsyeja konkrete, p.sh. «Ky material është i FSHMN-së». */
  title: string;
  body: string;
  onUnlock?: () => void;
  children: React.ReactNode;
  className?: string;
  intensity?: "sm" | "md";
}) {
  const t = useTranslations("pro");

  return (
    <div data-locked-overlay className={cn("relative overflow-hidden rounded-md", className)}>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none select-none",
          intensity === "sm" ? "blur-[3px]" : "blur-[6px]",
          "opacity-60 saturate-50",
        )}
      >
        {children}
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface/55 p-4 text-center">
        <span className="grid size-9 place-items-center rounded-full pro-gradient text-pro-contrast">
          <Lock className="size-4" />
        </span>
        <p className="text-sm font-semibold text-text">{title}</p>
        <p className="measure text-xs text-text-muted">{body}</p>
        {onUnlock ? (
          <Button variant="pro" size="sm" onClick={onUnlock} className="mt-1">
            {t("openWithPro")}
          </Button>
        ) : null}
      </div>

      <p className="sr-only">{t("previewNote")}</p>
    </div>
  );
}
