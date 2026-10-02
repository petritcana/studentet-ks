import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronRight, History, ListOrdered, Medal, Swords, Trophy } from "lucide-react";
import { CategoryPicker } from "@/components/competition/category-picker";
import { CompetitionFeed } from "@/components/competition/competition-feed";
import { RulesCard } from "@/components/competition/rules-card";
import { UniversityStandings } from "@/components/competition/university-standings";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CATEGORY_ICON, isCategory } from "@/lib/competition/categories";
import { loadDashboard } from "@/lib/competition/dashboard";
import { DAILY_QUESTIONS, DAILY_SECONDS } from "@/lib/competition/rules";
import { formatDate, formatNumber } from "@/lib/format";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("competition");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

/**
 * Gara: paneli që i bashkon të gjitha.
 *
 * Numrat e studentit lart, pastaj kuizi i ditës, beteja e shpejtë, betejat e
 * hapura, gara e universiteteve dhe çfarë po ndodh. Garë, jo kazino: pa monedha,
 * pa baste, pa ngjyra që pulsojnë.
 */
export default async function CompetitionPage() {
  const [me, locale, t] = await Promise.all([requireUser(), getLocale(), getTranslations("competition")]);
  const data = await loadDashboard(me);

  const tiles = [
    { label: t("yourRank"), value: data.stats.rank ? `#${formatNumber(data.stats.rank, locale)}` : "·", hint: data.stats.rank ? null : t("noRank") },
    { label: t("yourPoints"), value: formatNumber(data.stats.points, locale), hint: null },
    { label: t("yourUniversity"), value: data.stats.universityRank ? `#${data.stats.universityRank}` : "·", hint: me.university?.abbr ?? null },
    { label: t("quizWins"), value: formatNumber(data.stats.wins, locale), hint: null },
    { label: t("battles"), value: formatNumber(data.stats.battles, locale), hint: data.stats.streak > 1 ? t("streak", { count: data.stats.streak }) : null },
    { label: t("achievements"), value: formatNumber(data.stats.achievements, locale), hint: null },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-text">
            <Trophy className="size-6 text-accent-500" aria-hidden />
            {t("dashboardTitle")}
          </h1>
          <p className="measure text-sm text-text-muted">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/gara/renditja">
              <ListOrdered />
              {t("leaderboards")}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/gara/historia">
              <History />
              {t("history")}
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" data-competition-stats>
        {tiles.map((tile) => (
          <Card key={tile.label} className="flex flex-col gap-1 p-4">
            <span className="text-xs font-medium text-text-muted">{tile.label}</span>
            <span className="tabular text-2xl font-bold text-text">{tile.value}</span>
            {tile.hint ? <span className="truncate text-[11px] text-text-muted">{tile.hint}</span> : null}
          </Card>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <Card className="relative flex flex-wrap items-center gap-4 overflow-hidden p-5" data-daily>
            <span className="grid size-14 place-items-center rounded-2xl bg-brand-500/12 text-3xl" aria-hidden>
              🧠
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h2 className="text-lg font-semibold text-text">
                {t("dailyTitle")} · {formatDate(new Date(), locale)}
              </h2>
              <p className="text-sm text-text-muted">
                {t("dailyMeta", { count: DAILY_QUESTIONS, minutes: DAILY_SECONDS / 60 })}
              </p>
              <p className="text-xs text-text-muted">{t("dailyPlayers", { count: data.daily.players })}</p>
            </div>
            {data.daily.done ? (
              <div className="flex flex-col items-end gap-1">
                <span className="tabular text-2xl font-bold text-text">
                  {data.daily.correct}/{DAILY_QUESTIONS}
                </span>
                <Link href={`/gara/beteja/${data.daily.battleId}`} className="text-xs text-brand-600 hover:underline dark:text-brand-500">
                  {t("dailyDone", { correct: data.daily.correct ?? 0, total: DAILY_QUESTIONS })}
                </Link>
              </div>
            ) : (
              <Button asChild>
                <Link href={`/gara/beteja/${data.daily.battleId}`}>{t("dailyStart")}</Link>
              </Button>
            )}
          </Card>

          <Card className="flex flex-col gap-4 p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-text">
              <Swords className="size-5 text-brand-600 dark:text-brand-500" aria-hidden />
              {t("quickBattle")}
            </h2>
            <CategoryPicker suggested={data.suggested} />
          </Card>

          <Card className="flex flex-col gap-3 p-5" data-active-battles>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-text">{t("activeBattles")}</h2>
              {data.incoming > 0 ? <Badge variant="brand">{t("incomingCount", { count: data.incoming })}</Badge> : null}
            </div>
            {data.battles.length === 0 ? (
              <p className="text-sm text-text-muted">{t("noBattles")}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {data.battles.map((battle) => {
                  const category = isCategory(battle.category) ? battle.category : "general";
                  const state = battle.incoming
                    ? t("incomingChallenge", { name: battle.opponent?.name ?? "" })
                    : battle.status === "pending"
                      ? t("waitingAccept")
                      : battle.status === "waiting"
                        ? t("waitingOpponent")
                        : battle.played
                          ? t("waitingResult")
                          : t("yourTurn");
                  return (
                    <li key={battle.id}>
                      <Link
                        href={`/gara/beteja/${battle.id}`}
                        className="flex items-center gap-3 py-2.5 transition-colors duration-150 hover:bg-surface-2/50"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-lg" aria-hidden>
                          {CATEGORY_ICON[category]}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium text-text">{t(`cat_${category}`)}</span>
                          <span className="truncate text-xs text-text-muted">{state}</span>
                        </span>
                        {battle.opponent ? <Avatar name={battle.opponent.name} src={battle.opponent.avatar} size="xs" /> : null}
                        <ChevronRight className="size-4 text-text-muted" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="flex flex-col gap-3 p-5" data-university-competition>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-text">{t("universityTitle")}</h2>
              <span className="text-xs text-text-muted">
                {t("thisWeek")} · {t("weekEnds", { date: formatDate(data.week.endsAt, locale) })}
              </span>
            </div>
            <p className="text-sm text-text">{t("myContribution", { points: formatNumber(data.week.myContribution, locale) })}</p>
            <UniversityStandings rows={data.week.standings} highlight={me.universityId} />
            <Link href="/gara/renditja?tab=universitetet" className="self-start text-sm text-brand-600 hover:underline dark:text-brand-500">
              {t("viewRanking")}
            </Link>
          </Card>

          {data.events.length > 0 ? (
            <Card className="flex flex-col gap-3 p-5" data-team-events>
              <h2 className="text-base font-semibold text-text">{t("eventsTitle")}</h2>
              {data.events.map((event) => (
                <Link
                  key={event.id}
                  href={`/gara/ngjarje/${event.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-brand-500/50"
                >
                  <Badge variant="success">{t("eventLive")}</Badge>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{event.title}</span>
                  <span className="tabular text-sm font-semibold text-text">
                    {event.universityA.abbr} {event.scoreA} : {event.scoreB} {event.universityB.abbr}
                  </span>
                </Link>
              ))}
            </Card>
          ) : null}

          <Card className="flex flex-col gap-2 p-5">
            <h2 className="text-base font-semibold text-text">{t("feedTitle")}</h2>
            <CompetitionFeed items={data.feed} />
          </Card>
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-semibold text-text">
                <Medal className="size-5 text-accent-500" aria-hidden />
                {t("achievementsTitle")}
              </h2>
              <Link href="/gara/arritjet" className="text-xs text-brand-600 hover:underline dark:text-brand-500">
                {t("viewAll")}
              </Link>
            </div>
            <p className="tabular text-3xl font-bold text-text">{data.stats.achievements}</p>
          </Card>
          <Card className="flex flex-col gap-3 p-5">
            <h2 className="text-base font-semibold text-text">{t("leaderboards")}</h2>
            <div className="flex gap-2">
              <Button asChild variant="secondary" size="sm" className="flex-1">
                <Link href="/gara/renditja">{t("students")}</Link>
              </Button>
              <Button asChild variant="secondary" size="sm" className="flex-1">
                <Link href="/gara/renditja?tab=universitetet">{t("universities")}</Link>
              </Button>
            </div>
          </Card>
          <RulesCard />
        </aside>
      </div>
    </div>
  );
}
