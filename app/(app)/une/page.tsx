import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Bookmark,
  CalendarDays,
  Download,
  FileText,
  User as UserIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ScheduleGrid, TodayWidget } from "@/components/academic/schedule-grid";
import {
  FacultyRace,
  Leaderboard,
  StreakWidget,
  XpBar,
} from "@/components/gamification/panels";
import { InviteCard } from "@/components/social/invite-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getFacultyRace, getLeaderboard } from "@/lib/queries/leaderboard";
import { levelFor } from "@/lib/xp";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Unë",
  description: "Orari, progresi, badge-t dhe ruajtjet e tua.",
};

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await requireUser();

  const [enrollments, badges, leaderboard, race, invite, savedCount] = await Promise.all([
    db.enrollment.findMany({
      where: { userId: user.id },
      select: {
        course: {
          select: {
            id: true,
            name: true,
            slots: true,
            department: { select: { faculty: { select: { color: true } } } },
          },
        },
      },
    }),
    db.userBadge.findMany({
      where: { userId: user.id },
      select: {
        context: true,
        earnedAt: true,
        badge: { select: { code: true, name: true, description: true } },
      },
      orderBy: { earnedAt: "desc" },
    }),
    getLeaderboard(user.id, "generation"),
    getFacultyRace(),
    db.invite.findFirst({
      where: { inviterId: user.id, usedAt: null },
      select: { code: true },
    }),
    db.bookmark.count({ where: { userId: user.id } }),
  ]);

  const entries = enrollments.flatMap(({ course }) =>
    course.slots.map((slot) => ({
      id: slot.id,
      courseId: course.id,
      courseName: course.name,
      facultyColor: course.department.faculty.color,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room,
      kind: slot.kind,
    })),
  );

  const level = levelFor(user.xp);
  const activeToday =
    user.lastStreakAt !== null &&
    new Date(user.lastStreakAt).toDateString() === new Date().toDateString();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Unë"
        description="Orari, progresi dhe gjithçka që ke ruajtur."
        action={
          <Button asChild size="sm" variant="secondary">
            <Link href={`/u/${user.username}`}>
              <UserIcon />
              Profili publik
            </Link>
          </Button>
        }
      />

      <TodayWidget entries={entries} />

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text">Orari im</h2>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a href="/api/orari" download>
                <CalendarDays />
                Eksporto në kalendar
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href="/api/cv" download>
                <Download />
                Shkarko CV-në
              </a>
            </Button>
          </div>
        </div>
        <ScheduleGrid entries={entries} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <XpBar level={level} />
        <StreakWidget
          streak={user.dailyStreak}
          freezes={user.streakFreeze}
          activeToday={activeToday}
        />
      </div>

      <Leaderboard data={leaderboard} />
      <FacultyRace rows={race} />

      <Card className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-text">Badge-t e mia</h2>
          <span className="tabular text-xs text-text-muted">{badges.length}</span>
        </div>
        {badges.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">
            Ende asnjë. I pari vjen lehtë: ngarko një material për një lëndë që s&apos;ka asnjë.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {badges.map((item) => (
              <div
                key={`${item.badge.code}-${item.context ?? ""}`}
                className="flex items-start gap-3 rounded-md border border-border bg-surface-2 p-3"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-500/12 text-brand-500">
                  <BadgeCheck className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-text">
                    {item.badge.name}
                    {item.context ? `: ${item.context}` : ""}
                  </span>
                  <span className="block text-xs text-text-muted">
                    {item.badge.description}
                  </span>
                  <span className="mt-0.5 block text-xs text-text-muted">
                    {formatDate(item.earnedAt)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {invite ? <InviteCard code={invite.code} /> : null}

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bookmark className="size-4 text-brand-500" />
            <h2 className="text-sm font-semibold text-text">Ruajtjet</h2>
          </div>
          <Badge>{savedCount}</Badge>
        </div>
        <p className="mt-1 text-sm text-text-muted">
          Postimet, materialet dhe pyetjet që i ke lënë për më vonë.
        </p>
        <Button asChild size="sm" variant="outline" className="mt-3">
          <Link href="/une/ruajtjet">
            <FileText />
            Hapi ruajtjet
          </Link>
        </Button>
      </Card>
    </div>
  );
}
