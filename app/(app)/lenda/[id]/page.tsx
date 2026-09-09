import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  MessageCircleQuestion,
  Pin,
  Upload,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { MaterialCard } from "@/components/academic/material-card";
import { UserRow } from "@/components/social/user-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getSuggestedPeople } from "@/lib/suggestions";
import { facultyTheme } from "@/lib/faculties";
import { DAY_LABELS, MATERIAL_TYPE_LABELS, type MaterialType } from "@/lib/constants";
import { formatDate, timeAgoShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const course = await db.course.findUnique({
    where: { id },
    select: { name: true, code: true },
  });
  return {
    title: course?.name ?? "Lënda",
    description: course ? `Materialet, pyetjet dhe njerëzit e lëndës ${course.name}.` : undefined,
  };
}

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const course = await db.course.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      code: true,
      year: true,
      semester: true,
      ects: true,
      professor: true,
      department: {
        select: { name: true, faculty: { select: { name: true, color: true } } },
      },
      slots: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
      examDates: { orderBy: { date: "asc" }, take: 3 },
      _count: { select: { enrollments: true, materials: true, questions: true } },
    },
  });

  if (!course) notFound();

  const [pastExams, materials, questions, enrolled, suggestions, group] = await Promise.all([
    db.material.findMany({
      where: { courseId: id, type: { in: ["past_exam", "solved"] }, isHidden: false },
      orderBy: { academicYear: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        type: true,
        academicYear: true,
        verificationStatus: true,
      },
    }),
    db.material.findMany({
      where: { courseId: id, isHidden: false },
      orderBy: [{ verificationStatus: "asc" }, { downloads: "desc" }],
      take: 8,
      select: {
        id: true,
        title: true,
        type: true,
        size: true,
        pages: true,
        rating: true,
        ratingCount: true,
        downloads: true,
        academicYear: true,
        professor: true,
        verificationStatus: true,
        course: { select: { id: true, name: true } },
        uploader: { select: { name: true, username: true, avatar: true, isVerified: true } },
      },
    }),
    db.question.findMany({
      where: { courseId: id, isHidden: false },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        createdAt: true,
        acceptedAnswerId: true,
        _count: { select: { answers: true } },
      },
    }),
    db.enrollment.findUnique({
      where: {
        userId_courseId_academicYear: {
          userId: user.id,
          courseId: id,
          academicYear: "2025/26",
        },
      },
      select: { id: true },
    }),
    getSuggestedPeople(user.id, 4, { courseId: id }),
    db.group.findFirst({ where: { courseId: id, type: "course" }, select: { id: true } }),
  ]);

  const theme = facultyTheme(course.department.faculty.color);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={course.name} back="/materialet" />

      <Card className="overflow-hidden">
        <div className={cn("h-1.5 w-full", theme.dot)} aria-hidden />
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn(theme.bg, theme.text, theme.border)}>
              {theme.shortLabel}
            </Badge>
            <Badge>{course.code}</Badge>
            <Badge>viti {course.year}</Badge>
            <Badge>semestri {course.semester}</Badge>
            <Badge>{course.ects} ECTS</Badge>
            {enrolled ? <Badge variant="brand">Lëndë e jotja</Badge> : null}
          </div>

          <p className="text-sm text-text-muted">
            {course.department.name} · {course.professor}
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-muted">
            <span className="tabular inline-flex items-center gap-1.5">
              <Users className="size-4" />
              {course._count.enrollments} studentë
            </span>
            <span className="tabular">{course._count.materials} materiale</span>
            <span className="tabular">{course._count.questions} pyetje</span>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button asChild size="sm">
              <Link href={`/materialet/ngarko?lenda=${course.id}`}>
                <Upload />
                Ngarko material
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/pyetje/e-re?lenda=${course.id}`}>
                <MessageCircleQuestion />
                Bëj një pyetje
              </Link>
            </Button>
            {group ? (
              <Button asChild size="sm" variant="ghost">
                <Link href={`/grupet/${group.id}`}>Kanali i lëndës</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      {course.slots.length > 0 || course.examDates.length > 0 ? (
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-brand-500" />
            <h2 className="text-sm font-semibold text-text">Orari dhe afatet</h2>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {course.slots.map((slot) => (
              <li key={slot.id} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-text-muted">
                  {DAY_LABELS[slot.dayOfWeek]}
                </span>
                <span className="tabular text-text">
                  {slot.startTime}–{slot.endTime}
                </span>
                <span className="truncate text-text-muted">{slot.room}</span>
                <Badge className="ml-auto">
                  {slot.kind === "lecture" ? "Ligjëratë" : "Ushtrime"}
                </Badge>
              </li>
            ))}
            {course.examDates.map((exam) => (
              <li key={exam.id} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-text-muted">Provim</span>
                <span className="text-text">{exam.term}</span>
                <span className="tabular text-text-muted">{formatDate(exam.date)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {pastExams.length > 0 ? (
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Pin className="size-4 text-brand-500" />
            <h2 className="text-sm font-semibold text-text">Provimet e kaluara</h2>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Të fiksuara lart, sepse këtu i kërkon çdo gjeneratë.
          </p>
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {pastExams.map((exam) => (
              <li key={exam.id}>
                <Link
                  href={`/materialet/${exam.id}`}
                  className="flex items-center gap-3 py-2.5 first:pt-0"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-text">{exam.title}</span>
                    <span className="block truncate text-xs text-text-muted">
                      {MATERIAL_TYPE_LABELS[exam.type as MaterialType]} · {exam.academicYear}
                    </span>
                  </span>
                  {exam.verificationStatus === "verified" ? (
                    <Badge variant="success">I verifikuar</Badge>
                  ) : (
                    <Badge variant="warning">Pa verifikuar</Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-text">Materialet</h2>
          <Link
            href={`/materialet?lenda=${course.id}`}
            className="text-sm text-brand-500 hover:underline"
          >
            Shiko të gjitha
          </Link>
        </div>
        {materials.length === 0 ? (
          <EmptyState
            illustration="materials"
            title="Askush s'ka ngarkuar ende materiale për këtë lëndë"
            description="Bëhu i pari dhe merr badge-in Pionier."
            action={
              <Button asChild>
                <Link href={`/materialet/ngarko?lenda=${course.id}`}>
                  <Upload />
                  Ngarko material
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {materials.map((material) => (
              <MaterialCard key={material.id} material={material} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-text">Pyetjet</h2>
          <Link
            href={`/pyetje?lenda=${course.id}`}
            className="text-sm text-brand-500 hover:underline"
          >
            Shiko të gjitha
          </Link>
        </div>
        {questions.length === 0 ? (
          <EmptyState
            illustration="search"
            compact
            title="Asnjë pyetje ende"
            description="Nëse ke ngecur diku, pyet. Pyetja pa përgjigje shkon te ata që e kanë kaluar këtë lëndë."
          />
        ) : (
          <Card className="divide-y divide-border">
            {questions.map((question) => (
              <Link
                key={question.id}
                href={`/pyetje/${question.id}`}
                className="flex items-center gap-3 p-3 transition-colors hover:bg-surface-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text">{question.title}</span>
                  <span className="block text-xs text-text-muted">
                    {question._count.answers} përgjigje · {timeAgoShort(question.createdAt)}
                  </span>
                </span>
                {question.acceptedAnswerId ? (
                  <Badge variant="success">Zgjidhur</Badge>
                ) : (
                  <Badge variant="warning">Pa përgjigje të pranuar</Badge>
                )}
              </Link>
            ))}
          </Card>
        )}
      </section>

      {suggestions.length > 0 ? (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-text">Kush tjetër e ndjek këtë lëndë</h2>
          <div className="mt-3 flex flex-col gap-3">
            {suggestions.map((person) => (
              <UserRow key={person.id} person={person} followState="none" />
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
