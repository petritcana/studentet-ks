import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { TrendingUp, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PayoutRequest } from "@/components/courses/payout-request";
import { availableBalance, PAYOUT_MINIMUM_CENTS } from "@/lib/billing/ledger";
import { db } from "@/lib/db";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { isTeacher } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("payouts");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/**
 * Paneli i fitimeve te instruktorit.
 *
 * Çdo numer këtu vjen nga rreshtat e librit, kurrë nga një total i ruajtur
 * vecmas: nëse te dy do te ekzistonin, një ditë do te binin jashte sinkronit.
 */
export default async function EarningsPage() {
  const me = await requireUser();
  if (!isTeacher(me.actor)) redirect("/kurset");

  const [locale, t, tc] = await Promise.all([
    getLocale(),
    getTranslations("payouts"),
    getTranslations("courses"),
  ]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [entries, payouts, studentCount, courseCount] = await Promise.all([
    db.ledgerEntry.findMany({
      where: { instructorId: me.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        kind: true,
        grossCents: true,
        platformCents: true,
        instructorCents: true,
        currency: true,
        createdAt: true,
        course: { select: { title: true } },
      },
    }),
    db.payout.findMany({
      where: { instructorId: me.id },
      orderBy: { requestedAt: "desc" },
      take: 10,
    }),
    db.courseEnrollment.count({ where: { course: { instructorId: me.id } } }),
    db.onlineCourse.count({ where: { instructorId: me.id, status: "published" } }),
  ]);

  const balance = availableBalance(entries);
  const sales = entries.filter((entry) => entry.kind === "sale");
  const thisMonth = sales.filter((entry) => entry.createdAt >= monthStart);

  const sum = (rows: typeof sales, key: "grossCents" | "platformCents" | "instructorCents") =>
    rows.reduce((total, row) => total + row[key], 0);

  const tiles = [
    { label: t("balance"), value: formatMoney(balance, "EUR", locale), icon: Wallet },
    {
      label: t("thisMonth"),
      value: formatMoney(sum(thisMonth, "instructorCents"), "EUR", locale),
      icon: TrendingUp,
    },
    { label: t("students"), value: formatNumber(studentCount, locale), icon: Users },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-text">
          <Wallet className="size-5 text-brand-500" />
          {t("title")}
        </h1>
        <p className="measure text-sm text-text-muted">{t("share")}</p>
      </header>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div
              key={tile.label}
              className="flex flex-col gap-1 rounded-md border border-border bg-surface p-4"
            >
              <dt className="flex items-center gap-1.5 text-xs text-text-muted">
                <Icon className="size-3.5" />
                {tile.label}
              </dt>
              <dd className="tabular text-xl font-semibold text-text">{tile.value}</dd>
            </div>
          );
        })}
      </dl>

      <PayoutRequest
        balanceCents={balance}
        minimumCents={PAYOUT_MINIMUM_CENTS}
        hasPending={payouts.some((payout) =>
          ["requested", "approved"].includes(payout.status),
        )}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">{t("sales")}</h2>

        {sales.length === 0 ? (
          <p className="text-sm text-text-muted">{tc("emptyTeaching")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-md text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted">
                  <th className="py-2 pr-3 font-medium">{tc("title")}</th>
                  <th className="py-2 pr-3 font-medium">{t("gross")}</th>
                  <th className="py-2 pr-3 font-medium">{t("platformFee")}</th>
                  <th className="py-2 font-medium">{t("net")}</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 20).map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">
                      <span className="block truncate text-text">
                        {entry.course?.title ?? "-"}
                      </span>
                      <span className="tabular text-xs text-text-muted">
                        {formatDate(entry.createdAt, locale)}
                      </span>
                    </td>
                    <td className="tabular py-2 pr-3 text-text-muted">
                      {formatMoney(entry.grossCents, entry.currency, locale)}
                    </td>
                    <td className="tabular py-2 pr-3 text-text-muted">
                      {formatMoney(entry.platformCents, entry.currency, locale)}
                    </td>
                    <td className="tabular py-2 font-medium text-text">
                      {formatMoney(entry.instructorCents, entry.currency, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="tabular text-xs text-text-muted">
          {t("gross")}: {formatMoney(sum(sales, "grossCents"), "EUR", locale)} ·{" "}
          {t("platformFee")}: {formatMoney(sum(sales, "platformCents"), "EUR", locale)} ·{" "}
          {t("net")}: {formatMoney(sum(sales, "instructorCents"), "EUR", locale)}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">{t("history")}</h2>

        {payouts.length === 0 ? (
          <p className="text-sm text-text-muted">{t("noHistory")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {payouts.map((payout) => (
              <li
                key={payout.id}
                className="tabular flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm"
              >
                <span className="font-medium text-text">
                  {formatMoney(payout.amountCents, payout.currency, locale)}
                </span>
                <Badge
                  variant={
                    payout.status === "paid"
                      ? "success"
                      : payout.status === "rejected"
                        ? "danger"
                        : "warning"
                  }
                >
                  {t(`status_${payout.status}`)}
                </Badge>
                {payout.reference ? (
                  <code className="rounded-sm bg-surface-2 px-2 py-0.5 text-xs text-text-muted">
                    {payout.reference}
                  </code>
                ) : null}
                <span className="ml-auto text-xs text-text-muted">
                  {formatDate(payout.requestedAt, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-text-muted">{courseCount > 0 ? null : tc("emptyTeaching")}</p>
    </div>
  );
}
