import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CATEGORY_ICON, isCategory } from "@/lib/competition/categories";
import { teamEvents } from "@/lib/competition/team-events";
import { db } from "@/lib/db";
import { formatDate, formatNumber } from "@/lib/format";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("competition");
  return { title: t("historyTitle") };
}

export const dynamic = "force-dynamic";

type WeekResult = { rank: number; abbr: string; points: number };

/** Historia: betejat e mia, javët e mbyllura dhe ngjarjet e kaluara. Asgjë nuk fshihet. */
export default async function HistoryPage() {
  const [me, locale, t] = await Promise.all([requireUser(), getLocale(), getTranslations("competition")]);

  const [entries, weeks, events] = await Promise.all([
    db.battleEntry.findMany({
      where: { userId: me.id, finishedAt: { not: null } },
      orderBy: { finishedAt: "desc" },
      take: 30,
      select: {
        correct: true,
        finishedAt: true,
        battle: {
          select: {
            id: true,
            mode: true,
            category: true,
            status: true,
            winnerId: true,
            opponentId: true,
            challengerId: true,
            questionIds: true,
          },
        },
      },
    }),
    db.competitionWeek.findMany({ orderBy: { startsAt: "desc" }, take: 12 }),
    teamEvents({ take: 20 }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Link href="/gara" className="inline-flex w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="size-4" />
        {t("title")}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-text">{t("historyTitle")}</h1>

      <section className="flex flex-col gap-3" data-my-battles>
        <h2 className="text-base font-semibold text-text">{t("myBattles")}</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-text-muted">{t("noHistory")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => {
              const battle = entry.battle;
              const category = isCategory(battle.category) ? battle.category : "general";
              const total = (JSON.parse(battle.questionIds) as string[]).length;
              const outcome =
                battle.mode === "daily"
                  ? t("modeDaily")
                  : battle.mode === "event"
                    ? t("modeEvent")
                    : battle.status !== "finished"
                      ? t("outcomeOpen")
                      : !battle.opponentId
                        ? t("outcomeSolo")
                        : battle.winnerId === me.id
                          ? t("outcomeWon")
                          : battle.winnerId
                            ? t("outcomeLost")
                            : t("outcomeDraw");
              return (
                <li key={battle.id}>
                  <Link href={`/gara/beteja/${battle.id}`}>
                    <Card className="flex items-center gap-3 p-3 transition-colors hover:border-brand-500/50">
                      <span className="text-xl" aria-hidden>
                        {battle.mode === "daily" ? "🧠" : CATEGORY_ICON[category]}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium text-text">
                          {battle.mode === "daily" ? t("dailyTitle") : t(`cat_${category}`)}
                        </span>
                        <span className="text-xs text-text-muted">{entry.finishedAt ? formatDate(entry.finishedAt, locale) : ""}</span>
                      </span>
                      <Badge variant={battle.winnerId === me.id ? "success" : "neutral"}>{outcome}</Badge>
                      <span className="tabular w-10 text-right text-sm font-semibold text-text">
                        {entry.correct}/{total}
                      </span>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3" data-weekly-results>
        <h2 className="text-base font-semibold text-text">{t("weeklyResults")}</h2>
        {weeks.length === 0 ? (
          <p className="text-sm text-text-muted">{t("noUniversityAchievements")}</p>
        ) : (
          weeks.map((week) => {
            const results = (JSON.parse(week.results) as WeekResult[]).slice(0, 3);
            return (
              <Card key={week.weekKey} className="flex flex-col gap-2 p-4">
                <p className="text-sm font-semibold text-text">{t("weekLabel", { week: week.weekKey })}</p>
                <ol className="flex flex-col gap-1 text-sm">
                  {results.map((row) => (
                    <li key={row.abbr} className="flex items-center gap-2">
                      <span className="tabular w-5 text-text-muted">{row.rank}</span>
                      <span className="flex-1 text-text">{row.abbr}</span>
                      <span className="tabular text-text-muted">{t("pointsValue", { points: formatNumber(row.points, locale) })}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            );
          })
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-text">{t("pastEvents")}</h2>
        {events.length === 0 ? (
          <p className="text-sm text-text-muted">{t("noEvents")}</p>
        ) : (
          events.map((event) => (
            <Link key={event.id} href={`/gara/ngjarje/${event.id}`}>
              <Card className="flex items-center gap-3 p-3 transition-colors hover:border-brand-500/50">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{event.title}</span>
                {event.active ? <Badge variant="success">{t("eventLive")}</Badge> : null}
                <span className="tabular text-sm font-semibold text-text">
                  {event.universityA.abbr} {event.scoreA} : {event.scoreB} {event.universityB.abbr}
                </span>
              </Card>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
