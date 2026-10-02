import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProPanel, type PlanDto, type ProviderOption } from "@/components/pro/pro-panel";
import { availableProviders } from "@/lib/billing/providers";
import { applyStudentDiscount } from "@/lib/billing/types";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { maxExchangeableDays } from "@/lib/xp";

const PROVIDER_LABELS: Record<string, string> = {
  paddle: "paymentPaddle",
  localbank: "paymentBank",
  transfer: "paymentTransfer",
  voucher: "paymentVoucher",
  xp: "paymentXp",
  mock: "paymentMock",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("proPage");
  return { title: t("title"), description: t("subtitle") };
}

export const dynamic = "force-dynamic";

export default async function ProPage() {
  const [me, locale, t, tp] = await Promise.all([
    requireUser(),
    getLocale(),
    getTranslations("proPage"),
    getTranslations("pro"),
  ]);

  const [rawPlans, payments] = await Promise.all([
    db.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.payment.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        amountCents: true,
        currency: true,
        provider: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const plans: PlanDto[] = rawPlans.map((plan) => ({
    code: plan.code,
    months: plan.months,
    priceCents: plan.priceCents,
    discountedCents: applyStudentDiscount(plan.priceCents, plan.studentDiscount),
    currency: plan.currency,
    discountPercent: plan.studentDiscount,
  }));

  const providers: ProviderOption[] = availableProviders().map((code) => ({
    code,
    labelKey: PROVIDER_LABELS[code],
  }));

  const proDays = me.proUntil
    ? Math.max(0, Math.ceil((me.proUntil.getTime() - Date.now()) / 86_400_000))
    : 0;

  const activeSource = me.subscriptions.find((item) => item.expiresAt > new Date())?.source ?? null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text">{t("title")}</h1>
        <p className="measure text-sm text-text-muted">{t("subtitle")}</p>
      </header>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Badge variant={me.pro ? "success" : "neutral"}>
          {me.pro ? t("activeShort") : t("inactive")}
        </Badge>
        <span className="text-sm text-text">{t("status")}</span>
        {me.pro && me.proUntil ? (
          <span className="tabular text-sm text-text-muted">
            {formatDate(me.proUntil, locale)}
          </span>
        ) : null}
        {activeSource ? (
          <span className="ml-auto text-xs text-text-muted">
            {t(
              activeSource === "payment"
                ? "sourcePayment"
                : activeSource === "voucher"
                  ? "sourceVoucher"
                  : "sourceContribution",
            )}
          </span>
        ) : null}
        {proDays > 0 ? (
          <span className="w-full text-xs text-text">{tp("earnedDays", { days: proDays })}</span>
        ) : null}
      </Card>

      <ProPanel
        plans={plans}
        providers={providers}
        hasDiscount={me.isVerified}
        contributionXp={me.xpContribution}
        exchangeableDays={maxExchangeableDays(me.xpContribution)}
        bankIban={process.env.BANK_IBAN ?? null}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <Sparkles className="size-4 text-brand-500" />
            {t("includesList")}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {["incl1", "incl2", "incl3", "incl4", "incl5", "incl6", "incl7", "incl8", "incl9", "incl10"].map(
              (key) => (
                <li key={key} className="flex items-start gap-2 text-sm text-text">
                  <Check className="mt-0.5 size-4 shrink-0 text-success-text" />
                  {t(key)}
                </li>
              ),
            )}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-text">{t("freeList")}</h2>
          <ul className="flex flex-col gap-1.5">
            {["free1", "free2", "free3", "free4", "free5", "free6"].map((key) => (
              <li key={key} className="flex items-start gap-2 text-sm text-text-muted">
                <Check className="mt-0.5 size-4 shrink-0 text-text-muted" />
                {t(key)}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text">{t("history")}</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-text-muted">{t("noPayments")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="tabular flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm"
              >
                <span className="text-text">
                  {formatMoney(payment.amountCents, payment.currency, locale)}
                </span>
                <span className="text-text-muted">{t(PROVIDER_LABELS[payment.provider])}</span>
                <Badge variant={payment.status === "paid" ? "success" : "neutral"}>
                  {payment.status === "paid" ? t("activeShort") : t("inactive")}
                </Badge>
                <span className="ml-auto text-xs text-text-muted">
                  {formatDate(payment.createdAt, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
