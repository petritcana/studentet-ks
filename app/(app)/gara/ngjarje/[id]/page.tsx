import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Trophy } from "lucide-react";
import { PlayEventButton } from "@/components/competition/play-event-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isCategory } from "@/lib/competition/categories";
import { maintainCompetition } from "@/lib/competition/dashboard";
import { teamEventScores } from "@/lib/competition/team-events";
import { db } from "@/lib/db";
import { formatDate, formatNumber } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("competition");
  return { title: t("eventsTitle") };
}

export const dynamic = "force-dynamic";

/** «UP kundër UBT»: rezultati i drejtpërdrejtë, dhe loja për studentët e dy universiteteve. */
export default async function TeamEventPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, me, locale, t] = await Promise.all([params, requireUser(), getLocale(), getTranslations("competition")]);
  await maintainCompetition();

  const event = await db.teamEvent.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      category: true,
      startsAt: true,
      endsAt: true,
      scoreA: true,
      scoreB: true,
      winnerId: true,
      finalizedAt: true,
      universityAId: true,
      universityBId: true,
      universityA: { select: { abbr: true, name: true, slug: true } },
      universityB: { select: { abbr: true, name: true, slug: true } },
      battles: { select: { id: true }, take: 1 },
    },
  });
  if (!event) notFound();

  const live = event.finalizedAt ? null : await teamEventScores(event);
  const scoreA = live ? live.a : event.scoreA;
  const scoreB = live ? live.b : event.scoreB;
  const active = !event.finalizedAt && event.endsAt > new Date() && event.startsAt <= new Date();

  const mine = me.universityId === event.universityAId ? event.universityA : me.universityId === event.universityBId ? event.universityB : null;
  const played = event.battles[0]
    ? await db.battleEntry.findUnique({
        where: { battleId_userId: { battleId: event.battles[0].id, userId: me.id } },
        select: { finishedAt: true },
      })
    : null;

  const side = (university: { abbr: string; name: string; slug: string }, score: number, id: string) => (
    <Link
      href={`/gara/universiteti/${university.slug}`}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 rounded-2xl border p-4 text-center transition-colors",
        event.winnerId === id ? "border-accent-500 bg-accent-500/10" : "border-border hover:border-brand-500/50",
      )}
    >
      <span className="text-lg font-semibold text-text">{university.abbr}</span>
      <span className="tabular text-3xl font-bold text-text" data-score={university.abbr}>
        {formatNumber(score, locale)}
      </span>
      <span className="line-clamp-2 text-xs text-text-muted">{university.name}</span>
    </Link>
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5" data-team-event={event.id}>
      <Link href="/gara" className="inline-flex w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="size-4" />
        {t("title")}
      </Link>
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {active ? <Badge variant="success">{t("eventLive")}</Badge> : null}
          <span className="text-xs text-text-muted">{isCategory(event.category) ? t(`cat_${event.category}`) : ""}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">{event.title}</h1>
        <p className="text-sm text-text-muted">{t("eventEnds", { date: `${formatDate(event.endsAt, locale)}` })}</p>
      </header>

      <div className="flex items-stretch gap-3">
        {side(event.universityA, scoreA, event.universityAId)}
        <span className="self-center text-sm font-semibold text-text-muted">:</span>
        {side(event.universityB, scoreB, event.universityBId)}
      </div>

      <Card className="flex flex-col items-center gap-3 p-5 text-center">
        {event.finalizedAt ? (
          <p className="flex items-center gap-2 text-lg font-semibold text-text">
            <Trophy className="size-5 text-accent-500" aria-hidden />
            {event.winnerId
              ? t("eventWinner", {
                  university: event.winnerId === event.universityAId ? event.universityA.abbr : event.universityB.abbr,
                })
              : t("eventDraw")}
          </p>
        ) : played?.finishedAt && mine ? (
          <p className="text-sm text-text-muted">{t("eventPlayed", { university: mine.abbr })}</p>
        ) : played && event.battles[0] ? (
          <Button asChild>
            <Link href={`/gara/beteja/${event.battles[0].id}`}>{t("continue")}</Link>
          </Button>
        ) : active && mine && me.isVerified ? (
          <PlayEventButton eventId={event.id} label={t("eventPlay", { university: mine.abbr })} />
        ) : (
          <p className="text-sm text-text-muted">
            {t("eventNotYours", { a: event.universityA.abbr, b: event.universityB.abbr })}
          </p>
        )}
      </Card>
    </div>
  );
}
