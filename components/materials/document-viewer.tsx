"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Download, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LockedOverlay } from "@/components/ui/locked-overlay";
import { toast } from "@/components/ui/toast";
import { PaywallSheet, usePaywall } from "@/components/pro/paywall-sheet";
import { rateMaterial, registerDownload } from "@/lib/actions/materials";
import { cn } from "@/lib/utils";

export function DocumentViewer({
  materialId,
  title,
  pages,
  locked,
  facultyLabel,
  ownFaculty,
  isOwn,
  myRating,
}: {
  materialId: string;
  title: string;
  pages: number | null;
  locked: boolean;
  facultyLabel: string;
  ownFaculty: string;
  isOwn: boolean;
  myRating: number | null;
}) {
  const router = useRouter();
  const t = useTranslations("material");
  const tp = useTranslations("pro");
  const tc = useTranslations("common");
  const paywall = usePaywall();

  const [page, setPage] = React.useState(1);
  const [rating, setRating] = React.useState(myRating);
  const [pending, startTransition] = React.useTransition();
  const total = pages ?? 1;

  function download() {
    if (locked) {
      paywall.show({ kind: "material", faculty: facultyLabel, ownFaculty });
      return;
    }

    startTransition(async () => {
      const result = await registerDownload(materialId);
      if (!result.ok) {
        paywall.show({ kind: "material", faculty: facultyLabel, ownFaculty });
        return;
      }
      router.refresh();
    });
  }

  function rate(stars: number) {
    if (isOwn) {
      toast.error(t("rateOwn"));
      return;
    }
    setRating(stars);
    startTransition(async () => {
      const result = await rateMaterial(materialId, stars);
      if (!result.ok) {
        setRating(myRating);
        toast.error(t("rateOwn"));
        return;
      }
      toast.success(t("rated"));
      router.refresh();
    });
  }

  // Faqja e simuluar: në prodhim këtu vjen render-i i PDF-së nga ruajtja.
  const sheet = (
    <div className="flex aspect-[1/1.414] w-full flex-col gap-3 rounded-md border border-border bg-surface p-6 shadow-soft">
      <p className="text-sm font-semibold text-text">{title}</p>
      <p className="tabular text-xs text-text-muted">
        {t("page", { current: page, total })}
      </p>
      <div className="flex flex-1 flex-col gap-2">
        {Array.from({ length: 14 }).map((_, index) => (
          <span
            key={index}
            className="block h-2.5 rounded-full bg-text-muted/15"
            style={{ width: `${55 + ((index * 37) % 45)}%` }}
          />
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-3">
        {locked ? (
          <LockedOverlay
            title={tp("lockedTitle", { faculty: facultyLabel })}
            body={tp("lockedBody", { ownFaculty })}
            onUnlock={() => paywall.show({ kind: "material", faculty: facultyLabel, ownFaculty })}
          >
            {sheet}
          </LockedOverlay>
        ) : (
          sheet
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="iconSm"
            variant="ghost"
            aria-label={t("prevPage")}
            disabled={locked || page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeft />
          </Button>
          <span className="tabular text-xs text-text-muted">
            {page} / {total}
          </span>
          <Button
            size="iconSm"
            variant="ghost"
            aria-label={t("nextPage")}
            disabled={locked || page >= total}
            onClick={() => setPage((current) => Math.min(total, current + 1))}
          >
            <ChevronRight />
          </Button>

          <Button
            variant={locked ? "pro" : "primary"}
            size="sm"
            loading={pending}
            onClick={download}
            className="ml-auto"
          >
            <Download />
            {locked ? tp("openWithPro") : tc("download")}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-sm text-text">{t("rate")}</span>
          <div className="flex items-center gap-0.5" role="radiogroup" aria-label={t("rate")}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star}`}
                disabled={isOwn}
                onClick={() => rate(star)}
                className={cn(
                  "rounded-full p-1 transition-colors duration-150",
                  isOwn ? "cursor-not-allowed opacity-50" : "hover:bg-surface-2",
                )}
              >
                <Star
                  className={cn(
                    "size-4",
                    rating && star <= rating ? "fill-current text-warning-text" : "text-text-muted",
                  )}
                />
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted">{isOwn ? t("rateOwn") : t("rateHelp")}</p>
        </div>
      </div>

      <PaywallSheet open={paywall.open} onOpenChange={paywall.setOpen} context={paywall.context} />
    </>
  );
}
