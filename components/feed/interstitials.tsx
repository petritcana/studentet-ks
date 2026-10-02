"use client";

import { TimeAgo } from "@/components/shared/time-ago";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Calendar, FileText, HelpCircle, MapPin, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PersonCard } from "@/components/social/person-card";
import { formatDateShort, formatNumber, formatTime } from "@/lib/format";
import type { SuggestedPerson } from "@/lib/suggestions";

export type InterstitialData = {
  people: SuggestedPerson[];
  material: {
    id: string;
    title: string;
    type: string;
    rating: number;
    downloads: number;
    pages: number | null;
    courseName: string;
    uploader: { name: string; avatar: string | null };
  } | null;
  question: {
    id: string;
    title: string;
    courseName: string;
    answerCount: number;
    createdAt: string;
  } | null;
  event: {
    id: string;
    title: string;
    date: string;
    location: string;
    kind: string;
    goingCount: number;
  } | null;
};

function Frame({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-3 border-brand-500/25 bg-brand-500/4 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-text">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-500/12 text-brand-500">
          {icon}
        </span>
        {title}
      </p>
      {children}
    </Card>
  );
}

/** «Njerëz nga gjenerata jote», tre karta, gjithmonë me arsye nën emrin. */
export function PeopleInterstitial({ people }: { people: SuggestedPerson[] }) {
  const t = useTranslations("interstitial");
  if (people.length === 0) return null;

  return (
    <Frame icon={<Users className="size-4" />} title={t("peopleTitle")}>
      <p className="measure text-sm text-text-muted">{t("peopleBody")}</p>

      <div className="grid gap-3 sm:grid-cols-3">
        {people.slice(0, 3).map((person) => (
          <PersonCard key={person.id} person={person} compact className="rounded-md bg-surface p-3" />
        ))}
      </div>

      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/komuniteti">
          {t("peopleCta")}
          <ArrowRight />
        </Link>
      </Button>
    </Frame>
  );
}

export function MaterialInterstitial({
  material,
}: {
  material: NonNullable<InterstitialData["material"]>;
}) {
  const locale = useLocale();
  const t = useTranslations("interstitial");
  const tf = useTranslations("feed");
  const tm = useTranslations("materialType");
  const tmat = useTranslations("material");

  return (
    <Frame icon={<FileText className="size-4" />} title={tf("newMaterial")}>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-sm font-semibold text-text">{material.title}</p>
        <p className="tabular flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
          <span>{tm(material.type)}</span>
          <span>· {material.courseName}</span>
          {material.pages ? <span>· {material.pages}</span> : null}
          <span>
            · {tmat("downloads", { count: formatNumber(material.downloads, locale) })}
          </span>
        </p>
        <p className="text-xs text-text-muted">
          {material.rating > 0 ? (
            <span className="tabular inline-flex items-center gap-1 text-warning-text">
              <Star className="size-3 fill-current" />
              {material.rating.toFixed(1)}
            </span>
          ) : (
            tmat("noRating")
          )}
          <span> · {tmat("uploader")}: {material.uploader.name}</span>
        </p>
      </div>

      <Button asChild size="sm" className="self-start">
        <Link href={`/materialet/${material.id}`}>
          {t("materialCta")}
          <ArrowRight />
        </Link>
      </Button>
    </Frame>
  );
}

export function QuestionInterstitial({
  question,
}: {
  question: NonNullable<InterstitialData["question"]>;
}) {
  const t = useTranslations("interstitial");
  const tf = useTranslations("feed");
  const tq = useTranslations("question");

  return (
    <Frame icon={<HelpCircle className="size-4" />} title={tf("waitingQuestion")}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-pretty text-sm font-semibold text-text">{question.title}</p>
        <p className="tabular flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
          <span>{question.courseName}</span>
          <span>· {tq("answersCount", { count: question.answerCount })}</span>
          <span>· <TimeAgo value={question.createdAt} /></span>
        </p>
        <Badge variant="success" className="w-fit">
          {tf("waitingQuestionBadge")}
        </Badge>
      </div>

      <Button asChild size="sm" className="self-start">
        <Link href={`/pyetje/${question.id}`}>
          {t("questionCta")}
          <ArrowRight />
        </Link>
      </Button>
    </Frame>
  );
}

export function EventInterstitial({ event }: { event: NonNullable<InterstitialData["event"]> }) {
  const locale = useLocale();
  const t = useTranslations("interstitial");
  const tf = useTranslations("feed");
  const tk = useTranslations("eventKind");

  return (
    <Frame icon={<Calendar className="size-4" />} title={tf("happeningNow")}>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-sm font-semibold text-text">{event.title}</p>
        <p className="tabular flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
          <span>{tk(event.kind)}</span>
          <span>· {formatDateShort(event.date, locale)}</span>
          <span>· {formatTime(event.date)}</span>
        </p>
        <p className="flex items-center gap-1 text-xs text-text-muted">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{event.location}</span>
          {event.goingCount > 0 ? (
            <span className="shrink-0">· {tf("goingCount", { count: event.goingCount })}</span>
          ) : null}
        </p>
      </div>

      <Button asChild size="sm" className="self-start">
        <Link href={`/eventet/${event.id}`}>
          {t("eventCta")}
          <ArrowRight />
        </Link>
      </Button>
    </Frame>
  );
}
