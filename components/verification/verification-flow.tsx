"use client";

import { useTranslations } from "next-intl";
import { BadgeCheck, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

/**
 * Gjendja e verifikimit, pasi fotoja e ID-së është dërguar.
 *
 * Hapat (emaili studentor me kod, fotoja e ID-së) janë të njëjtët si te
 * regjistrimi (`components/auth/signup-steps.tsx`); faqja vendos cilin shfaq.
 */
export function VerificationStatus({ state, watching }: { state: "verified" | "pending"; watching: boolean }) {
  const t = useTranslations("verify");

  if (state === "verified") {
    return (
      <Card className="flex flex-col items-center gap-3 border-success/40 bg-success/5 p-8 text-center" data-verification-state="verified">
        <span className="grid size-12 place-items-center rounded-full bg-success/15 text-success-text">
          <BadgeCheck className="size-6" />
        </span>
        <Badge variant="success">{t("statusVerified")}</Badge>
        <p className="measure text-sm text-text-muted">{t("verifiedBody")}</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col items-center gap-3 p-8 text-center" data-verification-state="pending">
      <span className="grid size-12 place-items-center rounded-full bg-warning/15 text-warning-text">
        <Clock className="size-6" />
      </span>
      <Badge variant="warning">{t("statusPending")}</Badge>
      <p className="measure text-sm text-text-muted">{t("pendingBody")}</p>
      {watching ? <p className="measure text-xs text-text-dim">{t("pendingWatching")}</p> : null}
    </Card>
  );
}
