import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { achievementMetrics, ensureCompetitionBadges } from "@/lib/competition/achievements";
import { STUDENT_ACHIEVEMENTS } from "@/lib/competition/rules";
import { db } from "@/lib/db";
import { formatDate, formatNumber } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("competition");
  return { title: t("achievementsTitle") };
}

export const dynamic = "force-dynamic";

/** Arritjet e studentit me përparimin drejt secilës, dhe arritjet e universiteteve sipas javëve. */
export default async function AchievementsPage() {
  const [me, locale, t] = await Promise.all([requireUser(), getLocale(), getTranslations("competition")]);
  await ensureCompetitionBadges();

  const [metrics, owned, universities] = await Promise.all([
    achievementMetrics(me.id),
    db.userBadge.findMany({
      where: { userId: me.id, badge: { code: { startsWith: "comp_" } } },
      select: { earnedAt: true, badge: { select: { code: true } } },
    }),
    db.universityAchievement.findMany({
      orderBy: { awardedAt: "desc" },
      take: 30,
      select: { id: true, code: true, period: true, awardedAt: true, university: { select: { abbr: true, name: true, slug: true } } },
    }),
  ]);
  const earned = new Map(owned.map((row) => [row.badge.code, row.earnedAt]));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Link href="/gara" className="inline-flex w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="size-4" />
        {t("title")}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-text">{t("achievementsTitle")}</h1>

      <section className="grid gap-3 sm:grid-cols-2" data-achievements>
        {STUDENT_ACHIEVEMENTS.map((achievement) => {
          const at = earned.get(achievement.code);
          const value = Math.min(metrics[achievement.metric], achievement.threshold);
          return (
            <Card
              key={achievement.code}
              data-achievement={achievement.code}
              data-unlocked={at ? "true" : "false"}
              className={cn("flex items-start gap-3 p-4", !at && "opacity-80")}
            >
              <span
                className={cn(
                  "grid size-12 shrink-0 place-items-center rounded-2xl text-2xl",
                  at ? "bg-accent-500/15" : "bg-surface-2 grayscale",
                )}
                aria-hidden
              >
                {achievement.icon}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-text">
                  {t(`ach_${achievement.code}`)}
                  {!at ? <Lock className="size-3.5 text-text-muted" aria-label={t("locked")} /> : null}
                </p>
                <p className="text-xs text-text-muted">{t(`achDesc_${achievement.code}`)}</p>
                {at ? (
                  <p className="text-xs text-success-text">
                    {t("unlocked")} · {formatDate(at, locale)}
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${(value / achievement.threshold) * 100}%` }} />
                    </div>
                    <span className="tabular text-[11px] text-text-muted">
                      {t("progress", { value: formatNumber(value, locale), threshold: formatNumber(achievement.threshold, locale) })}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-text">{t("universityAchievements")}</h2>
        {universities.length === 0 ? (
          <p className="text-sm text-text-muted">{t("noUniversityAchievements")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {universities.map((row) => (
              <li key={row.id}>
                <Card className="flex items-center gap-3 p-3">
                  <span className="text-xl" aria-hidden>
                    🏆
                  </span>
                  <Link href={`/gara/universiteti/${row.university.slug}`} className="min-w-0 flex-1 hover:underline">
                    <span className="block truncate text-sm font-semibold text-text">{row.university.abbr}</span>
                    <span className="block truncate text-xs text-text-muted">{t(`uniAch_${row.code}`)}</span>
                  </Link>
                  <span className="tabular text-xs text-text-muted">
                    {row.period.includes("-W") ? t("weekLabel", { week: row.period }) : formatDate(row.awardedAt, locale)}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
