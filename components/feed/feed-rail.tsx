import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Calendar, Flame, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PersonCard } from "@/components/social/person-card";
import { db } from "@/lib/db";
import { formatDateShort, formatTime } from "@/lib/format";
import type { CurrentUser } from "@/lib/session";
import { getSuggestedPeople } from "@/lib/suggestions";
import { EXCHANGE_RATES, levelFor, levelLabelKey } from "@/lib/xp";

/**
 * Shtylla e djathtë e feed-it.
 *
 * Tregon tri gjëra që e mbajnë studentin brenda: sa Pro ka fituar me kontribut,
 * çfarë e pret këtë javë, dhe kë do ta njihte sot. Kurrë reklamë.
 */
export async function FeedRail({ user }: { user: CurrentUser }) {
  const [locale, t, tg, tp, ts, tsch] = await Promise.all([
    getLocale(),
    getTranslations("feed"),
    getTranslations("gamification"),
    getTranslations("pro"),
    getTranslations("social"),
    getTranslations("schedule"),
  ]);

  const [people, upcoming] = await Promise.all([
    getSuggestedPeople(user.id, 3, { locale }),
    db.event.findMany({
      where: { date: { gte: new Date() }, facultyId: user.facultyId ?? undefined },
      orderBy: { date: "asc" },
      take: 3,
      select: { id: true, title: true, date: true, kind: true },
    }),
  ]);

  const level = levelFor(user.xpContribution + user.xpActivity);
  const proDays = user.proUntil
    ? Math.max(0, Math.ceil((user.proUntil.getTime() - Date.now()) / 86_400_000))
    : 0;
  const towardsDay = Math.min(
    100,
    Math.round(((user.xpContribution % EXCHANGE_RATES[0].xp) / EXCHANGE_RATES[0].xp) * 100),
  );

  return (
    <>
      <Card className="flex flex-col gap-3 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-text">
          <Sparkles className="size-4 text-brand-500" />
          {tg(levelLabelKey(level.key))}
        </p>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">{tg("contributionXp")}</span>
            <span className="tabular font-medium text-text">{user.xpContribution}</span>
          </div>
          <Progress value={towardsDay} />
          <p className="text-xs text-text-muted">{tg("contributionHelp")}</p>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">{tg("activityXp")}</span>
          <span className="tabular font-medium text-text">{user.xpActivity}</span>
        </div>

        {proDays > 0 ? (
          <p className="rounded-sm bg-brand-500/8 px-2.5 py-2 text-xs text-text">
            {tp("earnedDays", { days: proDays })}
          </p>
        ) : (
          <p className="text-xs text-text-muted">{tp("earnBanner")}</p>
        )}

        <div className="flex items-center gap-2 border-t border-border pt-3">
          <Badge variant="accent">
            <Flame />
            {user.dailyStreak}
          </Badge>
          <span className="text-xs text-text-muted">{tg("streak")}</span>
          <Button asChild variant="ghost" size="sm" className="ml-auto">
            <Link href="/une">
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </Card>

      {upcoming.length > 0 ? (
        <Card className="flex flex-col gap-3 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-text">
            <Calendar className="size-4 text-brand-500" />
            {tsch("weekly")}
          </p>

          <ul className="flex flex-col gap-2">
            {upcoming.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/eventet/${event.id}`}
                  className="flex items-center gap-3 rounded-sm px-1 py-1 transition-colors hover:bg-surface-2"
                >
                  <span className="tabular flex w-12 shrink-0 flex-col text-center text-xs text-text-muted">
                    <span>{formatDateShort(event.date, locale)}</span>
                    <span>{formatTime(event.date)}</span>
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-text">{event.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {people.length > 0 ? (
        <Card className="flex flex-col gap-3 p-4">
          <p className="text-sm font-semibold text-text">{ts("suggested")}</p>
          <p className="text-xs text-text-muted">{ts("suggestedNote")}</p>

          <div className="flex flex-col gap-3">
            {people.map((person) => (
              <PersonCard key={person.id} person={person} compact />
            ))}
          </div>

          <Button asChild variant="ghost" size="sm" className="self-start">
            <Link href="/komuniteti">
              {t("seeMore")}
              <ArrowRight />
            </Link>
          </Button>
        </Card>
      ) : null}
    </>
  );
}
