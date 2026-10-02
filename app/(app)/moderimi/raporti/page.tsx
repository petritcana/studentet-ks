import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("moderation");
  return { title: t("publicTitle"), description: t("publicSubtitle") };
}

export const dynamic = "force-dynamic";

/**
 * Raporti publik i moderimit.
 *
 * Të gjitha shifrat janë të agreguara. Asnjë emër, asnjë detaj që identifikon
 * dikë: transparenca nuk duhet të bëhet turp publik.
 */
export default async function ModerationReportPage() {
  const [, locale, t] = await Promise.all([
    requireUser(),
    getLocale(),
    getTranslations("moderation"),
  ]);

  const [weeks, totals] = await Promise.all([
    db.moderationLog.findMany({ orderBy: { weekOf: "desc" }, take: 8 }),
    db.report.groupBy({ by: ["status"], _count: { status: true } }),
  ]);

  const total = totals.reduce((sum, row) => sum + row._count.status, 0);
  const actioned = totals.find((row) => row.status === "actioned")?._count.status ?? 0;
  const open = totals.find((row) => row.status === "open")?._count.status ?? 0;
  const peak = Math.max(1, ...weeks.map((week) => week.reviewed));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text">{t("publicTitle")}</h1>
        <p className="measure text-sm text-text-muted">{t("publicSubtitle")}</p>
      </header>

      <dl className="grid grid-cols-3 gap-3">
        {[
          { label: t("totalReports"), value: total },
          { label: t("withAction"), value: actioned },
          { label: t("pending"), value: open },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col gap-0.5 rounded-md border border-border bg-surface p-3"
          >
            <dt className="text-xs text-text-muted">{item.label}</dt>
            <dd className="tabular text-lg font-semibold text-text">{item.value}</dd>
          </div>
        ))}
      </dl>

      {weeks.length > 0 ? (
        <Card className="flex flex-col gap-3 p-4">
          <p className="text-sm font-semibold text-text">{t("weeks")}</p>
          {weeks.map((week) => (
            <div key={week.id} className="flex flex-col gap-1">
              <div className="tabular flex items-center justify-between text-xs">
                <span className="text-text-muted">
                  {t("week")} {formatDate(week.weekOf, locale)}
                </span>
                <span className="text-text">
                  {week.reviewed} {t("reviewed")} · {week.removed} {t("removed")}
                </span>
              </div>
              <Progress value={Math.round((week.reviewed / peak) * 100)} />
            </div>
          ))}
        </Card>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text">{t("whatIsRemoved")}</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-text-muted">
          {["removeReason1", "removeReason2", "removeReason3", "removeReason4", "removeReason5", "removeReason6"].map(
            (key) => (
              <li key={key} className="measure">
                {t(key)}
              </li>
            ),
          )}
        </ul>
        <p className="measure text-xs text-text-muted">{t("autoHide")}</p>
      </section>
    </div>
  );
}
