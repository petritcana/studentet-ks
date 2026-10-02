import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Minus, Plus, Sparkles, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { db } from "@/lib/db";
import { formatDate, formatNumber } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { DAILY_CAPS, EXCHANGE_RATES, levelFor, levelLabelKey } from "@/lib/xp";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("gamification");
  return { title: t("wallet"), robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

export default async function XpWalletPage() {
  const [me, locale, t] = await Promise.all([
    requireUser(),
    getLocale(),
    getTranslations("gamification"),
  ]);

  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const [transactions, todayByReason] = await Promise.all([
    db.xpTransaction.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        kind: true,
        amount: true,
        reason: true,
        revokedAt: true,
        createdAt: true,
      },
    }),
    db.xpTransaction.groupBy({
      by: ["reason"],
      where: { userId: me.id, kind: "activity", createdAt: { gte: since } },
      _count: { reason: true },
    }),
  ]);

  const level = levelFor(me.xpContribution + me.xpActivity);
  const usedToday = new Map(todayByReason.map((row) => [row.reason, row._count.reason]));
  const towardsDay = Math.min(
    100,
    Math.round(((me.xpContribution % EXCHANGE_RATES[0].xp) / EXCHANGE_RATES[0].xp) * 100),
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-text">
          <Sparkles className="size-5 text-brand-500" />
          {t("wallet")}
        </h1>
        <p className="measure text-sm text-text-muted">{t("walletBody")}</p>
      </header>

      <Card className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">{t(levelLabelKey(level.key))}</Badge>
          <span className="text-sm text-text-muted">{t(`${levelLabelKey(level.key)}Body`)}</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">{t("contributionXp")}</span>
              <span className="tabular font-medium text-text">
                {formatNumber(me.xpContribution, locale)}
              </span>
            </div>
            <Progress value={towardsDay} />
            <p className="text-xs text-text-muted">{t("contributionHelp")}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">{t("activityXp")}</span>
              <span className="tabular font-medium text-text">
                {formatNumber(me.xpActivity, locale)}
              </span>
            </div>
            <Progress value={level.percent} />
            <p className="text-xs text-text-muted">{t("activityHelp")}</p>
          </div>
        </div>

        {level.next ? (
          <p className="text-xs text-text-muted">
            {t("toNext", { xp: level.toNext, level: t(levelLabelKey(level.next)) })}
          </p>
        ) : (
          <p className="text-xs text-text-muted">{t("maxLevel")}</p>
        )}
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text">{t("dailyCap", { count: "" }).trim()}</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(DAILY_CAPS) as (keyof typeof DAILY_CAPS)[]).map((reason) => {
            const snake = reason.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
            const used = usedToday.get(snake) ?? 0;
            const cap = DAILY_CAPS[reason];
            const full = used >= cap;

            return (
              <span
                key={reason}
                className={
                  full
                    ? "tabular inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/8 px-2.5 py-1 text-xs text-warning-text"
                    : "tabular inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text-muted"
                }
              >
                {t(`reason_${snake}`)} {used}/{cap}
              </span>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text">{t("wallet")}</h2>

        {transactions.length === 0 ? (
          <EmptyState illustration="feed" compact title={t("walletEmpty")} />
        ) : (
          <ul className="flex flex-col">
            {transactions.map((entry) => {
              const revoked = Boolean(entry.revokedAt);
              const positive = entry.amount > 0 && !revoked;

              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 border-b border-border py-2.5 last:border-0"
                >
                  <span
                    className={
                      revoked
                        ? "grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-text-muted"
                        : positive
                          ? "grid size-7 shrink-0 place-items-center rounded-full bg-success/12 text-success-text"
                          : "grid size-7 shrink-0 place-items-center rounded-full bg-danger/12 text-danger-text"
                    }
                  >
                    {revoked ? (
                      <Undo2 className="size-3.5" />
                    ) : positive ? (
                      <Plus className="size-3.5" />
                    ) : (
                      <Minus className="size-3.5" />
                    )}
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm text-text">
                      {t(`reason_${entry.reason}`)}
                    </span>
                    <span className="tabular text-xs text-text-muted">
                      {formatDate(entry.createdAt, locale)} ·{" "}
                      {entry.kind === "contribution" ? t("contributionXp") : t("activityXp")}
                    </span>
                  </span>

                  {revoked ? <Badge variant="neutral">{t("revoked")}</Badge> : null}

                  <span
                    className={
                      revoked
                        ? "tabular shrink-0 text-sm text-text-muted line-through"
                        : positive
                          ? "tabular shrink-0 text-sm font-medium text-success-text"
                          : "tabular shrink-0 text-sm font-medium text-danger-text"
                    }
                  >
                    {entry.amount > 0 ? "+" : ""}
                    {entry.amount}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
