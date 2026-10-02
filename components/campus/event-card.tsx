"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AvatarStack } from "@/components/ui/avatar";
import { setRsvp } from "@/lib/actions/events";
import { formatDateShort, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type EventDto = {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  kind: string;
  /** A ka kaluar. Llogaritet në server, kurrë këtu. */
  past: boolean;
  goingCount: number;
  myStatus: "going" | "maybe" | "no" | null;
  /** Kush nga viti yt shkon: konteksti që e bind dikë të vijë. */
  sameYearGoing: { name: string; avatar: string | null }[];
  attendees: { name: string; avatar: string | null }[];
};

const CHOICES: { status: "going" | "maybe" | "no"; key: string }[] = [
  { status: "going", key: "eventGoing" },
  { status: "maybe", key: "eventMaybe" },
  { status: "no", key: "eventNo" },
];

export function EventCard({ event, compact = false }: { event: EventDto; compact?: boolean }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("campus");
  const tk = useTranslations("eventKind");
  const [status, setStatus] = React.useState(event.myStatus);
  const past = event.past;
  const [, startTransition] = React.useTransition();

  function choose(next: "going" | "maybe" | "no") {
    const optimistic = status === next ? null : next;
    setStatus(optimistic);
    startTransition(async () => {
      await setRsvp(event.id, next);
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <span className="tabular grid size-12 shrink-0 place-items-center rounded-md bg-accent-500/12 text-center text-xs font-semibold leading-tight text-accent-text">
          {formatDateShort(event.date, locale)}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Link
            href={`/eventet/${event.id}`}
            className="text-pretty text-sm font-semibold text-text transition-colors hover:text-brand-500"
          >
            {event.title}
          </Link>
          <p className="tabular flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
            <Badge variant="accent">{tk(event.kind)}</Badge>
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3" />
              {formatTime(event.date)}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{event.location}</span>
            </span>
          </p>
        </div>
      </div>

      {!compact && event.description ? (
        <p className="measure line-clamp-2 text-sm text-text-muted">{event.description}</p>
      ) : null}

      {event.attendees.length > 0 ? (
        <div className="flex items-center gap-2">
          <AvatarStack people={event.attendees} size="sm" max={4} />
          <span className="tabular text-xs text-text-muted">
            {t("eventGoing")}: {event.goingCount}
          </span>
        </div>
      ) : null}

      {event.sameYearGoing.length > 0 ? (
        <p className="text-xs text-success-text">
          {t("fromYourYearBadge")} · {event.sameYearGoing.map((person) => person.name).join(", ")}
        </p>
      ) : null}

      {past ? (
        <p className="text-xs text-text-muted">{t("eventPast")}</p>
      ) : (
        <div role="radiogroup" aria-label={t("eventGoing")} className="flex flex-wrap gap-1.5">
          {CHOICES.map((choice) => (
            <Button
              key={choice.status}
              size="sm"
              variant={status === choice.status ? "primary" : "outline"}
              role="radio"
              aria-checked={status === choice.status}
              onClick={() => choose(choice.status)}
              className={cn(status === choice.status && "shadow-soft")}
            >
              {t(choice.key)}
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
}
