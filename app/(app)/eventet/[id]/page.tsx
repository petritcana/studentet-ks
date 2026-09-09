import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Images, MapPin, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RsvpButtons } from "@/components/social/rsvp-buttons";
import { CommentThread } from "@/components/feed/comment-thread";
import { UserRow } from "@/components/social/user-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { EVENT_KIND_LABELS, type EventKind } from "@/lib/constants";
import { formatEventDate } from "@/lib/format";

export const metadata: Metadata = { title: "Eventi" };
export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const event = await db.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      date: true,
      location: true,
      kind: true,
      creator: {
        select: { id: true, name: true, username: true, avatar: true, isVerified: true },
      },
      faculty: { select: { id: true, name: true, color: true } },
      rsvps: {
        where: { status: { in: ["going", "maybe"] } },
        select: {
          status: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              isVerified: true,
              year: true,
              facultyId: true,
              faculty: { select: { name: true, color: true } },
            },
          },
        },
      },
      posts: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          text: true,
          createdAt: true,
          author: { select: { name: true, username: true, avatar: true, isVerified: true } },
        },
      },
    },
  });

  if (!event) notFound();

  const myRsvp = event.rsvps.find((rsvp) => rsvp.user.id === user.id)?.status ?? null;
  const going = event.rsvps.filter((rsvp) => rsvp.status === "going");
  const sameGeneration = going.filter(
    (rsvp) => rsvp.user.facultyId === user.facultyId && rsvp.user.year === user.year,
  );
  const isPast = event.date.getTime() < Date.now();

  const discussionPost = event.posts[0];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={event.title} back="/kampusi?tab=eventet" />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={event.kind === "study_together" ? "brand" : "neutral"}>
            {EVENT_KIND_LABELS[event.kind as EventKind] ?? event.kind}
          </Badge>
          {isPast ? <Badge variant="neutral">Ka kaluar</Badge> : null}
          {event.faculty ? <Badge>{event.faculty.name}</Badge> : null}
        </div>

        <div className="mt-4 flex flex-col gap-2 text-sm">
          <p className="flex items-center gap-2 text-text">
            <CalendarDays className="size-4 shrink-0 text-text-muted" />
            {formatEventDate(event.date)}
          </p>
          <p className="flex items-center gap-2 text-text">
            <MapPin className="size-4 shrink-0 text-text-muted" />
            {event.location}
          </p>
          <p className="flex items-center gap-2 text-text-muted">
            <Users className="size-4 shrink-0" />
            <span className="tabular">{going.length}</span> po shkojnë
            {sameGeneration.length > 0 ? (
              <span className="text-text">
                , {sameGeneration.length} nga gjenerata jote
              </span>
            ) : null}
          </p>
        </div>

        <p className="measure mt-4 whitespace-pre-line text-sm text-text">
          {event.description}
        </p>

        <p className="mt-4 text-xs text-text-muted">
          Organizues:{" "}
          <Link
            href={`/u/${event.creator.username}`}
            className="font-medium text-brand-500 hover:underline"
          >
            {event.creator.name}
          </Link>
        </p>

        {!isPast ? (
          <div className="mt-4 border-t border-border pt-4">
            <RsvpButtons eventId={event.id} current={myRsvp} />
          </div>
        ) : null}
      </Card>

      {isPast ? (
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Images className="size-4 text-brand-500" />
            <h2 className="text-sm font-semibold text-text">Albumi i përbashkët</h2>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            Eventi ka kaluar. Kush ka fotografi, i shton këtu që t&apos;i shohin të gjithë që
            ishin.
          </p>
        </Card>
      ) : null}

      <Card className="p-4">
        <h2 className="text-sm font-semibold text-text">
          Kush po shkon ({going.length})
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          {going.slice(0, 12).map((rsvp) => (
            <UserRow
              key={rsvp.user.id}
              person={{
                id: rsvp.user.id,
                name: rsvp.user.name,
                username: rsvp.user.username,
                avatar: rsvp.user.avatar,
                isVerified: rsvp.user.isVerified,
                facultyName: rsvp.user.faculty?.name ?? null,
                facultyColor: rsvp.user.faculty?.color ?? null,
                year: rsvp.user.year,
                reasons:
                  rsvp.user.facultyId === user.facultyId && rsvp.user.year === user.year
                    ? ["Nga gjenerata jote"]
                    : undefined,
              }}
            />
          ))}
          {going.length === 0 ? (
            <p className="text-sm text-text-muted">
              Ende askush. Bëhu i pari dhe të tjerët e shohin që po vjen dikush.
            </p>
          ) : null}
        </div>
      </Card>

      {discussionPost ? (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-text">Fija e diskutimit</h2>
          <div className="mt-4">
            <CommentThread
              postId={discussionPost.id}
              comments={[]}
              viewer={{ name: user.name, avatar: user.avatar }}
            />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
