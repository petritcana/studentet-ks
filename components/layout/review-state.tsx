"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Clock, IdCard, ShieldAlert } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * Llogaria që pret miratimin e ID-së.
 *
 * Studenti lexon gjithçka, por nuk shkruan ende para të tjerëve. Shiriti i
 * thotë hapur pse dhe çfarë mbetet; butonat që do të shkruanin japin të njëjtin
 * shpjegim në vend që të hapin një formular që s'dërgohet dot. Roja e vërtetë
 * rri te serveri (`requireParticipant`).
 */
export type ReviewState = "pending" | "rejected" | "missing" | null;

const ReviewContext = React.createContext<ReviewState>(null);

export function ReviewProvider({ state, children }: { state: ReviewState; children: React.ReactNode }) {
  return <ReviewContext.Provider value={state}>{children}</ReviewContext.Provider>;
}

/**
 * Kthen një funksion që, për llogarinë në shqyrtim, tregon shpjegimin dhe kthen
 * `true` (veprimi ndalet). Për të tjerët kthen `false` pa bërë asgjë.
 */
export function useReviewGuard() {
  return useReviewGuardFor(React.useContext(ReviewContext));
}

/** E njëjta, me gjendjen e dhënë drejt: për `AppChrome`, që rri mbi ofruesin. */
export function useReviewGuardFor(state: ReviewState) {
  const t = useTranslations("review");
  return React.useCallback(() => {
    if (!state) return false;
    toast.info(t(state === "rejected" ? "toastRejected" : state === "missing" ? "toastMissing" : "toastPending"));
    return true;
  }, [state, t]);
}

export function ReviewBar({ state }: { state: ReviewState }) {
  const t = useTranslations("review");
  if (!state) return null;

  const Icon = state === "rejected" ? ShieldAlert : state === "missing" ? IdCard : Clock;
  return (
    <div
      role="status"
      className={cn(
        "mb-4 flex flex-wrap items-center gap-3 rounded-card border px-4 py-3",
        state === "rejected" ? "border-danger/35 bg-danger/8" : "border-warning/35 bg-warning/10",
      )}
      data-review-bar={state}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full",
          state === "rejected" ? "bg-danger/15 text-danger-text" : "bg-warning/15 text-warning-text",
        )}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-sm font-semibold text-text">{t(`${state}Title`)}</p>
        <p className="text-xs text-text-muted">{t(`${state}Body`)}</p>
      </div>
      <Link
        href="/verifikimi"
        className="shrink-0 rounded-control px-3 py-2 text-sm font-bold text-brand-500 hover:bg-surface-2"
      >
        {t(state === "pending" ? "pendingCta" : "uploadCta")}
      </Link>
    </div>
  );
}
