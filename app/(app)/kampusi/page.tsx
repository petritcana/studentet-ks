import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { QuickCircles } from "@/components/social/quick-circles";
import { UserCard } from "@/components/social/user-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { AvatarStack } from "@/components/ui/avatar";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getSuggestedPeople } from "@/lib/suggestions";
import { facultyTheme } from "@/lib/faculties";
import { EVENT_KIND_LABELS, type EventKind } from "@/lib/constants";
import { formatEventDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Kampusi",
  description: "Njerëz, grupe dhe evente nga fakulteti dhe gjenerata jote.",
};

export const dynamic = "force-dynamic";

const TABS = [
  { key: "njerez", label: "Njerëz" },
  { key: "grupet", label: "Grupe" },
  { key: "eventet", label: "Evente" },
] as const;

export default async function CampusPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = TABS.find((item) => item.key === params.tab)?.key ?? "njerez";
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Kampusi"
        description="Njerëzit, grupet dhe eventet e fakultetit tënd. Çdo sugjerim vjen me arsyen pse."
      />

      <div
        role="tablist"
        aria-label="Seksionet e kampusit"
        className="flex items-center gap-1 rounded-full border border-border bg-bg p-1"
      >
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={`/kampusi?tab=${item.key}`}
            role="tab"
            aria-selected={tab === item.key}
            scroll={false}
            className={cn(
              "inline-flex h-9 flex-1 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors duration-150 ease-brand",
              tab === item.key
                ? "bg-surface text-text shadow-soft"
                : "text-text-muted hover:text-text",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {tab === "njerez" ? <PeopleTab userId={user.id} /> : null}
      {tab === "grupet" ? <GroupsTab userId={user.id} /> : null}
      {tab === "eventet" ? <EventsTab userId={user.id} /> : null}
    </div>
  );
}

async function PeopleTab({ userId }: { userId: string }) {
  const [people, following] = await Promise.all([
    getSuggestedPeople(userId, 24),
    db.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
  ]);
  const followingIds = new Set(following.map((item) => item.followingId));

  return (
    <div className="flex flex-col gap-5">
      <QuickCircles />

      {people.length === 0 ? (
        <EmptyState
          illustration="people"
          title="I ndoqe të gjithë nga gjenerata jote"
          description="Zgjero rrethin: ndiq ata që erdhën nga shkolla jote e mesme ose nga qyteti yt."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {people.map((person) => (
            <UserCard
              key={person.id}
              person={person}
              followState={followingIds.has(person.id) ? "following" : "none"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

async function GroupsTab({ userId }: { userId: string }) {
  const [mine, discover] = await Promise.all([
    db.group.findMany({
      where: { members: { some: { userId } } },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        facultyKey: true,
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
      take: 40,
    }),
    db.group.findMany({
      where: { members: { none: { userId } }, privacy: { not: "invite" } },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        facultyKey: true,
        _count: { select: { members: true } },
      },
      orderBy: { members: { _count: "desc" } },
      take: 12,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">Grupet e mia ({mine.length})</h2>
        {mine.length === 0 ? (
          <EmptyState
            illustration="people"
            compact
            title="Ende s'je në asnjë grup"
            description="Sapo të zgjedhësh lëndët, hyn automatikisht në kanalin e secilës."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {mine.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </section>

      {discover.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text">Zbulo grupe të tjera</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {discover.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function GroupCard({
  group,
}: {
  group: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    facultyKey: string | null;
    _count: { members: number };
  };
}) {
  const theme = facultyTheme(group.facultyKey);
  const typeLabel =
    group.type === "course" ? "Kanal lënde" : group.type === "generation" ? "Gjeneratë" : "Grup";

  return (
    <Link href={`/grupet/${group.id}`}>
      <Card interactive className="h-full p-4">
        <div className="flex items-start gap-3">
          <span className={cn("size-2.5 mt-1.5 shrink-0 rounded-full", theme.dot)} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text">{group.name}</p>
            {group.description ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-text-muted">{group.description}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge>{typeLabel}</Badge>
              <span className="tabular inline-flex items-center gap-1 text-xs text-text-muted">
                <Users className="size-3" />
                {group._count.members}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

async function EventsTab({ userId }: { userId: string }) {
  const events = await db.event.findMany({
    where: { date: { gte: new Date(Date.now() - 6 * 3600 * 1000) } },
    orderBy: { date: "asc" },
    take: 30,
    select: {
      id: true,
      title: true,
      description: true,
      date: true,
      location: true,
      kind: true,
      faculty: { select: { color: true } },
      rsvps: {
        where: { status: "going" },
        select: { user: { select: { id: true, name: true, avatar: true } } },
        take: 6,
      },
      _count: { select: { rsvps: true } },
    },
  });

  const mine = new Set(
    (
      await db.rsvp.findMany({
        where: { userId, eventId: { in: events.map((event) => event.id) } },
        select: { eventId: true },
      })
    ).map((item) => item.eventId),
  );

  if (events.length === 0) {
    return (
      <EmptyState
        illustration="calendar"
        title="S'ka evente të planifikuara"
        description="Nis ti i pari. «Studio bashkë» merr dy minuta për t'u shpallur."
        action={
          <Button asChild>
            <Link href="/eventet/i-ri">Shpall një event</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Button asChild variant="outline" className="self-start">
        <Link href="/eventet/i-ri">
          <CalendarDays />
          Shpall «Studio bashkë»
        </Link>
      </Button>

      {events.map((event) => (
        <Link key={event.id} href={`/eventet/${event.id}`}>
          <Card interactive className="p-4">
            <div className="flex items-start gap-4">
              <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-md border border-border bg-surface-2">
                <span className="text-[10px] uppercase tracking-wide text-text-muted">
                  {new Date(event.date)
                    .toLocaleDateString("sq-AL", { month: "short" })
                    .slice(0, 3)}
                </span>
                <span className="tabular text-lg font-semibold text-text">
                  {new Date(event.date).getDate()}
                </span>
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={event.kind === "study_together" ? "brand" : "neutral"}>
                    {EVENT_KIND_LABELS[event.kind as EventKind] ?? event.kind}
                  </Badge>
                  {mine.has(event.id) ? <Badge variant="success">Po vjen</Badge> : null}
                </div>
                <p className="mt-1.5 truncate text-sm font-semibold text-text">{event.title}</p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-text-muted">
                  <MapPin className="size-3 shrink-0" />
                  {formatEventDate(event.date)} · {event.location}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <AvatarStack people={event.rsvps.map((rsvp) => rsvp.user)} size="xs" max={4} />
                  <span className="text-xs text-text-muted">
                    {event._count.rsvps} po shkojnë
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
