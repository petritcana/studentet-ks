import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { SegmentedNav } from "@/components/shared/segmented-nav";
import { CourseCard, type CourseCardDto } from "@/components/courses/course-card";
import { db } from "@/lib/db";
import { isTeacher } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

const TABS = ["katalogu", "imet", "jap"] as const;
type CourseTab = (typeof TABS)[number];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("courses");
  return { title: t("title"), description: t("subtitle") };
}

export const dynamic = "force-dynamic";

/** Një kurs i vetëm i hartuar për karte, i perdorur nga te tri tabs. */
const COURSE_SELECT = {
  id: true,
  title: true,
  subtitle: true,
  coverImage: true,
  priceCents: true,
  currency: true,
  level: true,
  language: true,
  rating: true,
  ratingCount: true,
  status: true,
  instructor: { select: { name: true } },
  sections: { select: { _count: { select: { lessons: true } } } },
} as const;

type CourseRow = {
  id: string;
  title: string;
  subtitle: string | null;
  coverImage: string | null;
  priceCents: number;
  currency: string;
  level: string;
  language: string;
  rating: number;
  ratingCount: number;
  status: string;
  instructor: { name: string };
  sections: { _count: { lessons: number } }[];
};

function toCard(course: CourseRow, enrolled = false): CourseCardDto {
  return {
    id: course.id,
    title: course.title,
    subtitle: course.subtitle,
    coverImage: course.coverImage,
    priceCents: course.priceCents,
    currency: course.currency,
    level: course.level,
    language: course.language,
    rating: course.rating,
    ratingCount: course.ratingCount,
    lessonCount: course.sections.reduce((sum, section) => sum + section._count.lessons, 0),
    instructorName: course.instructor.name,
    status: course.status,
    enrolled,
  };
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [me, params, t] = await Promise.all([
    requireUser(),
    searchParams,
    getTranslations("courses"),
  ]);

  const teacher = isTeacher(me.actor);
  const tab = (TABS.includes(params.tab as CourseTab) ? params.tab : "katalogu") as CourseTab;

  const [published, enrolments, teaching] = await Promise.all([
    db.onlineCourse.findMany({
      where: { status: "published" },
      orderBy: { publishedAt: "desc" },
      take: 24,
      select: COURSE_SELECT,
    }),
    db.courseEnrollment.findMany({
      where: { userId: me.id },
      select: { courseId: true, course: { select: COURSE_SELECT } },
    }),
    teacher
      ? db.onlineCourse.findMany({
          where: { instructorId: me.id },
          orderBy: { updatedAt: "desc" },
          select: COURSE_SELECT,
        })
      : Promise.resolve([]),
  ]);

  const enrolledIds = new Set(enrolments.map((item) => item.courseId));

  const shown =
    tab === "imet"
      ? enrolments.map((item) => toCard(item.course, true))
      : tab === "jap"
        ? teaching.map((course) => toCard(course))
        : published.map((course) => toCard(course, enrolledIds.has(course.id)));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-text">{t("title")}</h1>
          <p className="measure text-sm text-text-muted">{t("subtitle")}</p>
        </div>

        {teacher ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link href="/kurset/fitimet">
                <Wallet />
                {t("earnings")}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/kurset/krijo">
                <Plus />
                {t("create")}
              </Link>
            </Button>
          </div>
        ) : null}
      </header>

      <SegmentedNav
        base="/kurset"
        active={tab}
        items={[
          { value: "katalogu", label: t("catalogue") },
          { value: "imet", label: t("mine"), count: enrolments.length },
          ...(teacher
            ? [{ value: "jap", label: t("teaching"), count: teaching.length }]
            : []),
        ]}
      />

      {shown.length === 0 ? (
        <EmptyState
          illustration="materials"
          title={tab === "jap" ? t("emptyTeaching") : t("empty")}
          action={
            teacher && tab === "jap" ? (
              <Button asChild size="sm">
                <Link href="/kurset/krijo">{t("create")}</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              href={tab === "jap" ? `/kurset/${course.id}/ndrysho` : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
