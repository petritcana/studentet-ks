import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmPaymentButton } from "@/components/admin/confirm-payment";
import { db } from "@/lib/db";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [, locale, t] = await Promise.all([
    requireAdmin(),
    getLocale(),
    getTranslations("admin"),
  ]);

  const now = new Date();
  // Raportet e reja të testuesve, për numrin te butoni.
  const newFeedback = await db.feedback.count({ where: { status: "new" } });

  const [
    totalUsers,
    proUsers,
    revenue,
    pendingPayments,
    impressions,
    clicks,
    activeAds,
    aiMessages,
    aiTokens,
    vouchers,
    plans,
    courseCount,
    courseSales,
    pendingPayouts,
    pendingVerifications,
  ] = await Promise.all([
    db.user.count(),
    db.subscription.count({ where: { status: "active", expiresAt: { gt: now } } }),
    db.payment.aggregate({ where: { status: "paid" }, _sum: { amountCents: true } }),
    db.payment.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        amountCents: true,
        currency: true,
        provider: true,
        reference: true,
        createdAt: true,
        user: { select: { name: true, username: true } },
      },
    }),
    db.adImpression.count(),
    db.adClick.count(),
    db.ad.count({ where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } } }),
    db.aiMessage.count(),
    db.aiMessage.aggregate({ _sum: { tokensIn: true, tokensOut: true, costMicros: true } }),
    db.voucher.count({ where: { usedBy: null } }),
    db.plan.findMany({ orderBy: { sortOrder: "asc" } }),
    db.onlineCourse.count({ where: { status: "published" } }),
    db.ledgerEntry.aggregate({
      where: { kind: "sale" },
      _sum: { grossCents: true, platformCents: true },
      _count: { id: true },
    }),
    db.payout.count({ where: { status: { in: ["requested", "approved"] } } }),
    db.verification.count({ where: { status: "pending" } }),
  ]);

  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "0.00";
  const tokens = (aiTokens._sum.tokensIn ?? 0) + (aiTokens._sum.tokensOut ?? 0);

  const tiles = [
    { label: t("totalUsers"), value: formatNumber(totalUsers, locale) },
    { label: t("proUsers"), value: formatNumber(proUsers, locale) },
    { label: t("revenue"), value: formatMoney(revenue._sum.amountCents ?? 0, "EUR", locale) },
    { label: t("impressions"), value: formatNumber(impressions, locale) },
    { label: t("clicks"), value: formatNumber(clicks, locale) },
    { label: t("ctr"), value: `${ctr}%` },
    { label: t("activeAds"), value: formatNumber(activeAds, locale) },
    { label: t("aiMessages"), value: formatNumber(aiMessages, locale) },
    { label: t("aiTokens"), value: formatNumber(tokens, locale) },
    { label: t("vouchers"), value: formatNumber(vouchers, locale) },
    {
      label: t("aiCost"),
      value: formatMoney(Math.round((aiTokens._sum.costMicros ?? 0) / 10_000), "EUR", locale),
    },
    { label: t("courses"), value: formatNumber(courseCount, locale) },
    { label: t("courseSales"), value: formatNumber(courseSales._count.id, locale) },
    {
      label: t("platformFee"),
      value: formatMoney(courseSales._sum.platformCents ?? 0, "EUR", locale),
    },
    { label: t("pendingPayouts"), value: formatNumber(pendingPayouts, locale) },
    { label: t("verifications"), value: formatNumber(pendingVerifications, locale) },
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="flex min-w-0 flex-1 items-center gap-2 text-2xl font-semibold tracking-tight text-text">
          <ShieldCheck className="size-5 text-brand-500" />
          {t("title")}
        </h1>
        <Button asChild size="sm">
          <Link href="/admin/njoftimet">{t("announcementsLink")}</Link>
        </Button>
        <Button asChild size="sm" variant="secondary">
          <Link href="/admin/reklamat">{t("adsLink")}</Link>
        </Button>
        <Button asChild size="sm" variant="secondary">
          <Link href="/admin/punet">{t("jobsLink")}</Link>
        </Button>
        <Button asChild size="sm" variant="secondary">
          <Link href="/admin/gara">{t("competitionLink")}</Link>
        </Button>
        <Button asChild size="sm" variant="secondary">
          <Link href="/admin/gjurma">{t("auditTitle")}</Link>
        </Button>
        <Button asChild size="sm" variant="secondary">
          <Link href="/admin/testimi">
            {t("feedbackLink")}
            {newFeedback > 0 ? (
              <span className="tabular ml-1 rounded-full bg-primary px-1.5 text-[11px] font-bold text-on-primary">{newFeedback}</span>
            ) : null}
          </Link>
        </Button>
        <Button asChild size="sm" variant="secondary">
          <Link href="/admin/pro">{t("proLink")}</Link>
        </Button>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="flex flex-col gap-0.5 rounded-md border border-border bg-surface p-3"
          >
            <dt className="text-xs text-text-muted">{tile.label}</dt>
            <dd className="tabular text-lg font-semibold text-text">{tile.value}</dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">{t("payments")}</h2>

        {pendingPayments.length === 0 ? (
          <p className="text-sm text-text-muted">{t("confirmed")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pendingPayments.map((payment) => (
              <li key={payment.id}>
                <Card className="flex flex-wrap items-center gap-3 p-3">
                  <Link
                    href={`/u/${payment.user.username}`}
                    className="min-w-0 flex-1 truncate text-sm text-text hover:text-brand-500"
                  >
                    {payment.user.name}
                  </Link>
                  <span className="tabular text-sm text-text">
                    {formatMoney(payment.amountCents, payment.currency, locale)}
                  </span>
                  <Badge variant="neutral">{payment.provider}</Badge>
                  {payment.reference ? (
                    <code className="tabular rounded-sm bg-surface-2 px-2 py-0.5 text-xs text-text-muted">
                      {payment.reference}
                    </code>
                  ) : null}
                  <span className="tabular text-xs text-text-muted">
                    {formatDate(payment.createdAt, locale)}
                  </span>
                  <ConfirmPaymentButton paymentId={payment.id} />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">{t("plans")}</h2>
        <ul className="flex flex-col gap-2">
          {plans.map((plan) => (
            <li
              key={plan.id}
              className="tabular flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              <span className="text-text">{plan.code}</span>
              <span className="text-text-muted">{plan.months}</span>
              <span className="text-text">
                {formatMoney(plan.priceCents, plan.currency, locale)}
              </span>
              <Badge variant="success">−{plan.studentDiscount}%</Badge>
              <Badge variant={plan.isActive ? "brand" : "neutral"} className="ml-auto">
                {plan.isActive ? t("activeAds") : t("plans")}
              </Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
