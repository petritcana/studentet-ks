"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { requestPayout } from "@/lib/actions/payouts";
import { formatMoney } from "@/lib/format";

/**
 * Kerkesa për terheqje.
 *
 * Butoni fiket nen pragun minimal dhe e thote pragun me numer, jo me fjalen
 * "pak": një instruktor duhet ta dije sa i mungon.
 */
export function PayoutRequest({
  balanceCents,
  minimumCents,
  hasPending,
}: {
  balanceCents: number;
  minimumCents: number;
  hasPending: boolean;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("payouts");
  const tc = useTranslations("common");

  const [note, setNote] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const eligible = balanceCents >= minimumCents && !hasPending;

  function submit() {
    startTransition(async () => {
      const result = await requestPayout(note);
      if (!result.ok) {
        const key = result.messageKey ?? "";
        toast.error(
          key === "payouts.errorBelowMinimum"
            ? t("errorBelowMinimum")
            : key === "payouts.errorPending"
              ? t("errorPending")
              : tc("retry"),
        );
        return;
      }
      toast.success(t("requested"));
      setNote("");
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-text">
        <Wallet className="size-4 text-brand-500" />
        {t("request")}
      </p>

      <p className="tabular text-xs text-text-muted">
        {t("minimum", { amount: formatMoney(minimumCents, "EUR", locale) })}
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <Input
          value={note}
          maxLength={120}
          placeholder={t("note")}
          aria-label={t("note")}
          onChange={(event) => setNote(event.target.value)}
          className="min-w-40 flex-1"
        />
        <Button onClick={submit} loading={pending} disabled={!eligible}>
          {t("request")}
        </Button>
      </div>

      {hasPending ? <p className="text-xs text-warning-text">{t("errorPending")}</p> : null}
    </Card>
  );
}
