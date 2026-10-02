import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { UniversityStandings } from "@/components/competition/university-standings";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  PERIODS,
  periodStart,
  STUDENT_SCOPES,
  studentLeaderboard,
  type Period,
  type StudentRow,
  type StudentScope,
} from "@/lib/competition/leaderboards";
import { universityStandings } from "@/lib/competition/weekly";
import { formatNumber } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("competition");
  return { title: t("leaderboards") };
}

export const dynamic = "force-dynamic";

type Search = { tab?: string; scope?: string; period?: string };

function chip(active: boolean) {
  return cn(
    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150",
    active ? "border-brand-500 bg-brand-500/10 text-text" : "border-border text-text-muted hover:text-text",
  );
}

/** Renditjet e garës. Filtrat janë lidhje, që çdo pamje të ketë adresën e vet. */
export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [params, me, locale, t] = await Promise.all([searchParams, requireUser(), getLocale(), getTranslations("competition")]);

  const tab = params.tab === "universitetet" ? "universities" : "students";
  const scope = (STUDENT_SCOPES as string[]).includes(params.scope ?? "") ? (params.scope as StudentScope) : "global";
  const fallback: Period = tab === "universities" ? "week" : "all";
  const period = (PERIODS as string[]).includes(params.period ?? "") ? (params.period as Period) : fallback;

  const href = (next: Partial<Search>) => {
    const query = new URLSearchParams();
    const merged = { tab: tab === "universities" ? "universitetet" : undefined, scope, period, ...next };
    if (merged.tab) query.set("tab", merged.tab);
    if (merged.scope && merged.scope !== "global" && merged.tab !== "universitetet") query.set("scope", merged.scope);
    if (merged.period) query.set("period", merged.period);
    const text = query.toString();
    return `/gara/renditja${text ? `?${text}` : ""}`;
  };

  const students = tab === "students" ? await studentLeaderboard(me, scope, period) : null;
  const universities = tab === "universities" ? await universityStandings(periodStart(period)) : null;

  const row = (entry: StudentRow, mine: boolean) => (
    <li
      key={`${entry.userId}-${mine ? "me" : "row"}`}
      data-leader={entry.username}
      className={cn(
        "grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-xl px-3 py-2.5 sm:grid-cols-[2rem_1fr_5rem_4rem_4rem_4rem]",
        mine ? "border border-brand-500/60 bg-brand-500/6" : "hover:bg-surface-2/60",
      )}
    >
      <span className="tabular text-sm font-bold text-text-muted">{entry.rank}</span>
      <Link href={`/u/${entry.username}`} className="flex min-w-0 items-center gap-2.5">
        <Avatar name={entry.name} src={entry.avatar} size="sm" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-text">
            {entry.name}
            {mine ? <span className="ml-1.5 text-xs text-brand-600 dark:text-brand-500">({t("you")})</span> : null}
          </span>
          <span className="truncate text-xs text-text-muted">
            @{entry.username}
            {entry.university ? ` · ${entry.university}` : ""}
          </span>
        </span>
      </Link>
      <span className="tabular text-right text-sm font-semibold text-text">{formatNumber(entry.points, locale)}</span>
      <span className="tabular hidden text-right text-sm text-text-muted sm:block">{entry.wins}</span>
      <span className="tabular hidden text-right text-sm text-text-muted sm:block">{entry.battles}</span>
      <span className="tabular hidden text-right text-sm text-text-muted sm:block">{entry.achievements}</span>
    </li>
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <Link href="/gara" className="inline-flex w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="size-4" />
        {t("title")}
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text">{t("leaderboards")}</h1>
        <p className="measure text-sm text-text-muted">{t("leaderboardNote")}</p>
      </header>

      <nav className="flex gap-1 border-b border-border" aria-label={t("leaderboards")}>
        {(["students", "universities"] as const).map((value) => (
          <Link
            key={value}
            href={value === "students" ? "/gara/renditja" : "/gara/renditja?tab=universitetet"}
            aria-current={tab === value ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === value ? "border-brand-500 text-text" : "border-transparent text-text-muted hover:text-text",
            )}
          >
            {t(value)}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-2">
        {tab === "students" ? (
          <div className="flex flex-wrap gap-1.5" aria-label={t("scope_global")}>
            {STUDENT_SCOPES.map((value) => (
              <Link key={value} href={href({ scope: value })} aria-current={scope === value ? "page" : undefined} className={chip(scope === value)}>
                {t(`scope_${value}`)}
              </Link>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((value) => (
            <Link key={value} href={href({ period: value })} aria-current={period === value ? "page" : undefined} className={chip(period === value)}>
              {t(`period_${value}`)}
            </Link>
          ))}
        </div>
      </div>

      {students ? (
        <Card className="flex flex-col gap-1 p-3" data-student-leaderboard>
          {!students.available ? (
            <p className="py-6 text-center text-sm text-text-muted">{t("scopeUnavailable")}</p>
          ) : students.rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">{t("emptyLeaderboard")}</p>
          ) : (
            <>
              <div className="hidden grid-cols-[2rem_1fr_5rem_4rem_4rem_4rem] gap-3 px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-text-muted sm:grid">
                <span>{t("colPosition")}</span>
                <span>{t("colStudent")}</span>
                <span className="text-right">{t("colPoints")}</span>
                <span className="text-right">{t("colWins")}</span>
                <span className="text-right">{t("colBattles")}</span>
                <span className="text-right">{t("colAchievements")}</span>
              </div>
              <ol className="flex flex-col gap-0.5">{students.rows.map((entry) => row(entry, entry.userId === me.id))}</ol>
              {students.me && !students.rows.some((entry) => entry.userId === me.id) ? (
                <div className="flex flex-col gap-1 border-t border-border pt-2">
                  <p className="px-3 text-[11px] font-medium uppercase tracking-wide text-text-muted">{t("yourPosition")}</p>
                  <ol>{row(students.me, true)}</ol>
                </div>
              ) : null}
            </>
          )}
        </Card>
      ) : null}

      {universities ? (
        <Card className="p-3">
          <UniversityStandings rows={universities} highlight={me.universityId} detailed />
        </Card>
      ) : null}
    </div>
  );
}
