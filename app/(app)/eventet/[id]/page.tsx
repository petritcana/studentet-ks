import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarDays, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EventCard } from "@/components/campus/event-card";
import { UserIdentityLine } from "@/components/identity/user-identity-line";
import { db } from "@/lib/db";
import { toPublicAuthor } from "@/lib/dto";
import { formatDate, formatTime } from "@/lib/format";
import { getMyRsvp } from "@/lib/queries/campus";
import { requireUser } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await db.event.findUnique({ where: { id }, select: { title: true } });
  return { title: event?.title ?? "" };
}

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, me, locale] = await Promise.all([params, requireUser(), getLocale()]);

  const event = await db.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      date: true,
      endDate: true,
      location: true,
      kind: true,
      creator: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          isVerified: true,
          year: true,
          proEarnedUntil: true,
          university: { select: { abbr: true } },
          faculty: { select: { name: true, nameEn: true, color: true } },
          subscriptions: { where: { status: "active" }, select: { status: true, expiresAt: true } },
        },
      },
      rsvps: {
        where: { status: "going" },
        take: 40,
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              isVerified: true,
              year: true,
              facultyId: true,
              proEarnedUntil: true,
              university: { select: { abbr: true } },
              faculty: { select: { name: true, nameEn: true, color: true } },
              subscriptions: {
                where: { status: "active" },
                select: { status: true, expiresAt: true },
              },
            },
          },
        },
      },
    },
  });
  if (!event) notFound();

  const [t, tk, myStatus] = await Promise.all([
    getTranslations("campus"),
    getTranslations("eventKind"),
    getMyRsvp(id, me.id),
  ]);

  const sameYear = event.rsvps.filter(
    (rsvp) =>
      rsvp.userId !== me.id && rsvp.user.year === me.year && rsvp.user.facultyId === me.facultyId,
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Card className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-col gap-2">
          <Badge variant="accent" className="w-fit">
            {tk(event.kind)}
          </Badge>
          <h1 className="text-pretty text-2xl font-semibold tracking-tight text-text">
            {event.title}
          </h1>
        </div>

        <div className="flex flex-col gap-1.5 text-sm text-text-muted">
          <p className="tabular flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0" />
            {formatDate(event.date, locale)} · {formatTime(event.date)}
            {event.endDate ? `, ${formatTime(event.endDate)}` : ""}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" />
            {event.location}
          </p>
        </div>

        <p className="measure whitespace-pre-wrap text-pretty text-sm text-text">
          {event.description}
        </p>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-xs text-text-muted">{t("organiser")}</p>
          <UserIdentityLine user={toPublicAuthor(event.creator, locale)} size="sm" />
        </div>
      </Card>

      <EventCard
        event={{
          id: event.id,
          title: event.title,
          description: "",
          date: event.date.toISOString(),
          location: event.location,
          kind: event.kind,
          past: event.date.getTime() < Date.now(),
          goingCount: event.rsvps.length,
          myStatus,
          sameYearGoing: sameYear
            .slice(0, 3)
            .map((rsvp) => ({ name: rsvp.user.name, avatar: rsvp.user.avatar })),
          attendees: event.rsvps
            .slice(0, 6)
            .map((rsvp) => ({ name: rsvp.user.name, avatar: rsvp.user.avatar })),
        }}
        compact
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">{t("whoIsGoing")}</h2>
        {sameYear.length > 0 ? (
          <p className="text-xs text-success-text">
            {t("fromYourYear")} · {sameYear.length}
          </p>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          {event.rsvps.map((rsvp) => (
            <UserIdentityLine
              key={rsvp.userId}
              user={toPublicAuthor(rsvp.user, locale)}
              size="sm"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
