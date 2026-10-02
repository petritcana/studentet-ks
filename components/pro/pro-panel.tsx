"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { exchangeXp, redeemVoucher, startCheckout } from "@/lib/actions/billing";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PlanDto = {
  code: string;
  months: number;
  priceCents: number;
  discountedCents: number;
  currency: string;
  discountPercent: number;
};

export type ProviderOption = { code: string; labelKey: string };

export function ProPanel({
  plans,
  providers,
  hasDiscount,
  contributionXp,
  exchangeableDays,
  bankIban,
}: {
  plans: PlanDto[];
  providers: ProviderOption[];
  hasDiscount: boolean;
  contributionXp: number;
  exchangeableDays: number;
  bankIban: string | null;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("proPage");
  const tp = useTranslations("pro");
  const tc = useTranslations("common");
  const errors = useTranslations("errors");

  const [planCode, setPlanCode] = React.useState(plans[0]?.code ?? "");
  const [provider, setProvider] = React.useState(providers[0]?.code ?? "transfer");
  const [reference, setReference] = React.useState<string | null>(null);
  const [voucher, setVoucher] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function messageFor(key: string | undefined) {
    if (!key) return tc("retry");
    if (key.startsWith("errors.")) return errors(key.replace("errors.", ""));
    if (key.startsWith("proPage.")) return t(key.replace("proPage.", ""));
    return tc("retry");
  }

  function buy() {
    startTransition(async () => {
      const result = await startCheckout(planCode, provider);
      if (!result.ok) {
        toast.error(messageFor(result.messageKey));
        return;
      }
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      if (result.reference) {
        setReference(result.reference);
        return;
      }
      toast.success(t("exchangeDone", { days: 0 }));
      router.refresh();
    });
  }

  function exchange(days: number) {
    startTransition(async () => {
      const result = await exchangeXp(days);
      if (!result.ok) {
        toast.error(messageFor(result.messageKey));
        return;
      }
      toast.success(t("exchangeDone", { days }));
      router.refresh();
    });
  }

  function redeem() {
    startTransition(async () => {
      const result = await redeemVoucher(voucher);
      if (!result.ok) {
        toast.error(t("voucherInvalid"));
        return;
      }
      toast.success(t("voucherRedeemed"));
      setVoucher("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-3 border-brand-500/25 bg-brand-500/4 p-4 sm:p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-text">
          <Sparkles className="size-4 text-brand-500" />
          {t("earnedTitle")}
        </p>
        <p className="measure text-sm text-text-muted">{t("earnedBody")}</p>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <span className="tabular text-sm text-text">
            {t("exchangeBalance", { xp: contributionXp })}
          </span>
          <span className="tabular text-xs text-text-muted">
            {t("exchangeDays", { days: exchangeableDays })}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {[1, 30, 150].map((days) => (
            <Button
              key={days}
              size="sm"
              variant="outline"
              disabled={pending || exchangeableDays < days}
              onClick={() => exchange(days)}
            >
              {t("exchangeDays", { days })}
            </Button>
          ))}
        </div>
        <p className="text-xs text-text-muted">{tp("exchangeRate")}</p>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">{t("plans")}</h2>

        <div className="grid gap-3 sm:grid-cols-3">
          {plans.map((plan) => {
            const active = plan.code === planCode;
            const price = hasDiscount ? plan.discountedCents : plan.priceCents;

            return (
              <button
                key={plan.code}
                type="button"
                aria-pressed={active}
                onClick={() => setPlanCode(plan.code)}
                className={cn(
                  "flex flex-col gap-1.5 rounded-lg border p-4 text-left",
                  "transition-all duration-150 ease-brand",
                  active
                    ? "border-brand-500 bg-brand-500/8 shadow-soft"
                    : "border-border bg-surface hover:border-brand-500/40",
                )}
              >
                <span className="text-sm font-semibold text-text">
                  {t(
                    plan.months === 1
                      ? "planMonthly"
                      : plan.months <= 6
                        ? "planSemester"
                        : "planYearly",
                  )}
                </span>
                <span className="tabular text-xl font-semibold text-text">
                  {formatMoney(price, plan.currency, locale)}
                </span>
                <span className="tabular text-xs text-text-muted">
                  {t("perMonth", {
                    price: formatMoney(Math.round(price / plan.months), plan.currency, locale),
                  })}
                </span>
                {hasDiscount && plan.discountPercent > 0 ? (
                  <Badge variant="success" className="w-fit">
                    −{plan.discountPercent}% {t("discount")}
                  </Badge>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">{t("payment")}</h2>

        <div className="flex flex-wrap gap-2">
          {providers.map((item) => (
            <Button
              key={item.code}
              size="sm"
              variant={provider === item.code ? "primary" : "outline"}
              onClick={() => setProvider(item.code)}
            >
              {t(item.labelKey)}
            </Button>
          ))}
        </div>

        <Button variant="pro" size="lg" loading={pending} onClick={buy} className="self-start">
          <Sparkles />
          {t("choosePlan")}
        </Button>

        {reference ? (
          <Card className="flex flex-col gap-2 p-4">
            <p className="text-sm font-semibold text-text">{t("transferTitle")}</p>
            <p className="measure text-sm text-text-muted">{t("transferBody")}</p>
            {bankIban ? <p className="tabular text-sm text-text">{bankIban}</p> : null}
            <div className="flex items-center gap-2">
              <code className="tabular rounded-sm bg-surface-2 px-2 py-1 text-sm text-text">
                {reference}
              </code>
              <Button
                size="iconSm"
                variant="ghost"
                aria-label={t("reference")}
                onClick={() => {
                  void navigator.clipboard.writeText(reference);
                  toast.success(t("reference"));
                }}
              >
                <Copy />
              </Button>
            </div>
          </Card>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">{t("voucherTitle")}</h2>
        <p className="measure text-sm text-text-muted">{t("voucherBody")}</p>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-48 flex-1 flex-col gap-1.5">
            <Label htmlFor="voucher-code">{t("voucherTitle")}</Label>
            <Input
              id="voucher-code"
              value={voucher}
              maxLength={24}
              placeholder={t("voucherPlaceholder")}
              onChange={(event) => setVoucher(event.target.value)}
            />
          </div>
          <Button onClick={redeem} loading={pending} disabled={voucher.trim().length < 4}>
            <Check />
            {t("voucherRedeem")}
          </Button>
        </div>
      </section>
    </div>
  );
}
