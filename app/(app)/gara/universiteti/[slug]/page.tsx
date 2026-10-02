import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { CompetitionFeed } from "@/components/competition/competition-feed";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { recentEvents } from "@/lib/competition/feed";
import { universityTotal } from "@/lib/competition/points";
import { weekStandings } from "@/lib/competition/weekly";
import { db } from "@/lib/db";
import { formatDate, formatNumber } from "@/lib/format";
import { requireUser } from "@/lib/session";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const university = await db.university.findUnique({ where: { slug }, select: { abbr: true } });
  const t = await getTranslations("competition");
  return { title: `${university?.abbr ?? ""} · ${t("universityPanel")}` };
}

export const dynamic = "force-dynamic";

/**
 * Gara e një universiteti: vendi këtë javë, pikët gjithsej, studentët aktivë,
 * fitoret, kuizet, kontributet, arritjet dhe studentët më aktivë.
 */
export default async function UniversityCompetitionPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, , locale, t] = await Promise.all([params, requireUser(), getLocale(), getTranslations("competition")]);

  const university = await db.university.findUnique({
    where: { slug },
    select: { id: true, name: true, abbr: true, city: true },
  });
  if (!university) notFound();

  const [weekly, total, participants, bySource, achievements, feed, top] = await Promise.all([
    weekStandings(),
    universityTotal(university.id),
    db.competitionPoint.groupBy({ by: ["userId"], where: { universityId: university.id, revokedAt: null } }),
    db.competitionPoint.groupBy({
      by: ["source"],
      where: { universityId: university.id, revokedAt: null },
      _count: { _all: true },
    }),
    db.universityAchievement.findMany({
      where: { universityId: university.id },
      orderBy: { awardedAt: "desc" },
      take: 12,
      select: { id: true, code: true, period: true, awardedAt: true },
    }),
    recentEvents(8, university.id),
    db.competitionPoint.groupBy({
      by: ["userId"],
      where: { universityId: university.id, revokedAt: null },
      _sum: { points: true },
      orderBy: { _sum: { points: "desc" } },
      take: 5,
    }),
  ]);

  const count = (sources: string[]) =>
    bySource.filter((row) => sources.includes(row.source)).reduce((sum, row) => sum + row._count._all, 0);
  const rank = weekly.standings.findIndex((row) => row.universityId === university.id);
  const people = await db.user.findMany({
    where: { id: { in: top.map((row) => row.userId) } },
    select: { id: true, name: true, username: true, avatar: true },
  });

  const tiles = [
    { label: t("currentPosition"), value: rank >= 0 ? `#${rank + 1}` : "·" },
    { label: t("allTimePoints"), value: formatNumber(total, locale) },
    { label: t("activeStudents"), value: formatNumber(participants.length, locale) },
    { label: t("quizWins"), value: formatNumber(count(["battle_win"]), locale) },
    { label: t("challengesCompleted"), value: formatNumber(count(["battle_complete", "daily_quiz", "event_quiz"]), locale) },
    { label: t("contributionsCount"), value: formatNumber(count(["material_approved", "answer_accepted", "post_useful"]), locale) },
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6" data-university-panel={university.abbr}>
      <Link href="/gara/renditja?tab=universitetet" className="inline-flex w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="size-4" />
        {t("leaderboards")}
      </Link>
      <header className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{t("universityPanel")}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-text">{university.abbr}</h1>
        <p className="text-sm text-text-muted">
          {university.name} · {university.city}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.label} className="flex flex-col gap-1 p-4">
            <span className="text-xs font-medium text-text-muted">{tile.label}</span>
            <span className="tabular text-2xl font-bold text-text">{tile.value}</span>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-base font-semibold text-text">{t("topStudents")}</h2>
          {top.length === 0 ? (
            <p className="text-sm text-text-muted">{t("emptyLeaderboard")}</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {top.map((row, index) => {
                const person = people.find((item) => item.id === row.userId);
                if (!person) return null;
                return (
                  <li key={row.userId} className="flex items-center gap-3">
                    <span className="tabular w-5 text-sm text-text-muted">{index + 1}</span>
                    <Avatar name={person.name} src={person.avatar} size="sm" />
                    <Link href={`/u/${person.username}`} className="min-w-0 flex-1 truncate text-sm font-medium text-text hover:underline">
                      {person.name}
                    </Link>
                    <span className="tabular text-sm text-text-muted">{formatNumber(row._sum.points ?? 0, locale)}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-base font-semibold text-text">{t("universityAchievements")}</h2>
          {achievements.length === 0 ? (
            <p className="text-sm text-text-muted">{t("noUniversityAchievements")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {achievements.map((row) => (
                <li key={row.id} className="flex items-center gap-2 text-sm">
                  <span aria-hidden>🏆</span>
                  <span className="flex-1 text-text">{t(`uniAch_${row.code}`)}</span>
                  <span className="tabular text-xs text-text-muted">
                    {row.period.includes("-W") ? t("weekLabel", { week: row.period }) : formatDate(row.awardedAt, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="flex flex-col gap-2 p-5">
        <h2 className="text-base font-semibold text-text">{t("recentActivity")}</h2>
        <CompetitionFeed items={feed} />
      </Card>
    </div>
  );
}
