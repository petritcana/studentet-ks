import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarClock, HelpCircle, Upload, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { MaterialRow } from "@/components/materials/material-row";
import { PersonCard } from "@/components/social/person-card";
import { facultyStyle } from "@/lib/faculties";
import { formatDate } from "@/lib/format";
import { db } from "@/lib/db";
import { getMaterials } from "@/lib/queries/materials";
import { requireUser } from "@/lib/session";
import { getSuggestedPeople } from "@/lib/suggestions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const course = await db.course.findUnique({ where: { id }, select: { name: true } });
  return { title: course?.name ?? "" };
}

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, me, locale] = await Promise.all([params, requireUser(), getLocale()]);
  const english = locale === "en";

  const course = await db.course.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      nameEn: true,
      code: true,
      ects: true,
      year: true,
      semester: true,
      professor: true,
      department: {
        select: {
          name: true,
          nameEn: true,
          faculty: { select: { name: true, nameEn: true, color: true } },
        },
      },
      examDates: {
        where: { date: { gte: new Date() } },
        orderBy: { date: "asc" },
        take: 4,
        select: { id: true, date: true, term: true, room: true },
      },
      _count: { select: { enrollments: true, materials: true, questions: true } },
    },
  });
  if (!course) notFound();

  const [materials, classmates, t, tq, tsch, te] = await Promise.all([
    getMaterials({ ...me.access, courseIds: me.courseIds }, { courseId: id }, locale),
    getSuggestedPeople(me.id, 3, { courseId: id, locale }),
    getTranslations("material"),
    getTranslations("question"),
    getTranslations("schedule"),
    getTranslations("empty"),
  ]);

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-5"
      style={facultyStyle(course.department.faculty.color)}
    >
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="faculty">
            {english ? course.department.faculty.nameEn : course.department.faculty.name}
          </Badge>
          <span className="tabular text-xs text-text-muted">{course.code}</span>
        </div>

        <h1 className="text-pretty text-2xl font-semibold tracking-tight text-text">
          {english ? course.nameEn : course.name}
        </h1>

        <p className="tabular flex flex-wrap items-center gap-x-3 text-xs text-text-muted">
          <span>
            {course.ects} ECTS · {course.year}
          </span>
          {course.professor ? <span>· {course.professor}</span> : null}
          <span className="inline-flex items-center gap-1">
            · <Users className="size-3" />
            {course._count.enrollments}
          </span>
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/materialet/ngarko">
            <Upload />
            {t("upload")}
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/pyetje/re?lenda=${course.id}`}>
            <HelpCircle />
            {tq("ask")}
          </Link>
        </Button>
      </div>

      {course.examDates.length > 0 ? (
        <Card className="flex flex-col gap-2 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-text">
            <CalendarClock className="size-4 text-brand-500" />
            {tsch("exam")}
          </p>
          <ul className="flex flex-col gap-1.5">
            {course.examDates.map((exam) => (
              <li key={exam.id} className="tabular flex flex-wrap items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-text-muted">
                  {formatDate(exam.date, locale)}
                </span>
                <Badge variant="warning">{exam.term}</Badge>
                {exam.room ? <span className="text-text-muted">{exam.room}</span> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">{t("title")}</h2>

        {materials.length === 0 ? (
          <EmptyState
            illustration="materials"
            compact
            title={te("course.title")}
            description={te("course.body")}
            action={
              <Button asChild size="sm">
                <Link href="/materialet/ngarko">{te("course.action")}</Link>
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {materials.map((material) => (
              <MaterialRow key={material.id} material={material} />
            ))}
          </div>
        )}
      </section>

      {classmates.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text">{tq("enrolledHint")}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {classmates.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
