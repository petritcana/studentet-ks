import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CheckCircle2, FileText, ListChecks, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EnrollButton } from "@/components/courses/enroll-button";
import { UserIdentityLine } from "@/components/identity/user-identity-line";
import { db } from "@/lib/db";
import { toPublicAuthor } from "@/lib/dto";
import { formatDate, formatMoney } from "@/lib/format";
import { requireUser } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const course = await db.onlineCourse.findUnique({ where: { id }, select: { title: true } });
  return { title: course?.title ?? "" };
}

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, me, locale] = await Promise.all([params, requireUser(), getLocale()]);

  const course = await db.onlineCourse.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      subtitle: true,
      description: true,
      priceCents: true,
      currency: true,
      level: true,
      language: true,
      status: true,
      rating: true,
      ratingCount: true,
      instructorId: true,
      instructor: {
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
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, kind: true, duration: true, isPreview: true },
          },
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          stars: true,
          comment: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      },
    },
  });
  if (!course) notFound();

  const allLessons = course.sections.flatMap((section) => section.lessons);

  const [t, enrolment, progress] = await Promise.all([
    getTranslations("courses"),
    db.courseEnrollment.findUnique({
      where: { courseId_userId: { courseId: id, userId: me.id } },
      select: { id: true },
    }),
    db.lessonProgress.findMany({
      where: { userId: me.id, completed: true, lessonId: { in: allLessons.map((lesson) => lesson.id) } },
      select: { lessonId: true },
    }),
  ]);

  const enrolled = Boolean(enrolment);
  const isOwn = course.instructorId === me.id;
  const done = new Set(progress.map((row) => row.lessonId));
  const nextLesson = allLessons.find((lesson) => !done.has(lesson.id)) ?? allLessons[0];
  const lessonCount = course.sections.reduce((sum, section) => sum + section.lessons.length, 0);
  const totalSeconds = course.sections.reduce(
    (sum, section) =>
      sum + section.lessons.reduce((inner, lesson) => inner + (lesson.duration ?? 0), 0),
    0,
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">{t(`level_${course.level}`)}</Badge>
          <Badge variant="neutral">{course.language.toUpperCase()}</Badge>
          {course.status !== "published" ? (
            <Badge variant="warning">{t(`status_${course.status}`)}</Badge>
          ) : null}
        </div>

        <h1 className="text-pretty text-2xl font-semibold tracking-tight text-text">
          {course.title}
        </h1>
        {course.subtitle ? (
          <p className="measure text-sm text-text-muted">{course.subtitle}</p>
        ) : null}

        <p className="tabular flex flex-wrap items-center gap-x-3 text-xs text-text-muted">
          <span>{t("lessons", { count: lessonCount })}</span>
          <span>· {t("duration", { minutes: Math.round(totalSeconds / 60) })}</span>
          {course.ratingCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-warning-text">
              · <Star className="size-3 fill-current" />
              {course.rating.toFixed(1)} ({course.ratingCount})
            </span>
          ) : null}
        </p>
      </header>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className="tabular text-xl font-semibold text-text">
          {course.priceCents === 0
            ? t("free")
            : formatMoney(course.priceCents, course.currency, locale)}
        </span>
        <EnrollButton
          courseId={course.id}
          enrolled={enrolled}
          isOwn={isOwn}
          continueHref={nextLesson ? `/kurset/${course.id}/mesimi/${nextLesson.id}` : null}
          priceLabel={
            course.priceCents === 0
              ? t("free")
              : formatMoney(course.priceCents, course.currency, locale)
          }
        />
      </Card>

      <p className="measure whitespace-pre-wrap text-pretty text-sm text-text">
        {course.description}
      </p>

      <Card className="flex flex-col gap-2 p-4">
        <p className="text-xs text-text-muted">{t("instructor")}</p>
        <UserIdentityLine user={toPublicAuthor(course.instructor, locale)} size="sm" />
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">{t("curriculum")}</h2>

        {course.sections.map((section) => (
          <Card key={section.id} className="flex flex-col gap-2 p-4">
            <p className="text-sm font-medium text-text">{section.title}</p>
            <ul className="flex flex-col gap-1.5">
              {section.lessons.map((lesson) => (
                <li key={lesson.id}>
                  {enrolled || isOwn || lesson.isPreview ? (
                    <Link
                      href={`/kurset/${course.id}/mesimi/${lesson.id}`}
                      className="flex items-center gap-2 rounded-md px-1 py-1 text-sm text-text transition-colors duration-150 hover:bg-surface-2"
                    >
                      <LessonRow lesson={lesson} done={done.has(lesson.id)} previewLabel={t("preview")} />
                    </Link>
                  ) : (
                    <span className="flex items-center gap-2 px-1 py-1 text-sm text-text-muted">
                      <LessonRow lesson={lesson} done={false} previewLabel={t("preview")} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">{t("reviews")}</h2>
        <p className="text-xs text-text-muted">{t("reviewOnlyEnrolled")}</p>

        {course.reviews.length === 0 ? (
          <p className="text-sm text-text-muted">{t("noReviews")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {course.reviews.map((review) => (
              <li key={review.id} className="flex flex-col gap-1 border-b border-border pb-3 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text">{review.user.name}</span>
                  <span className="tabular inline-flex items-center gap-0.5 text-xs text-warning-text">
                    <Star className="size-3 fill-current" />
                    {review.stars}
                  </span>
                  <span className="tabular ml-auto text-xs text-text-muted">
                    {formatDate(review.createdAt, locale)}
                  </span>
                </div>
                {review.comment ? (
                  <p className="measure text-sm text-text-muted">{review.comment}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {enrolled ? (
        <p className="flex items-center gap-2 text-sm text-success-text">
          <CheckCircle2 className="size-4" />
          {t("alreadyEnrolled")}
        </p>
      ) : null}
    </div>
  );
}

function LessonRow({
  lesson,
  done,
  previewLabel,
}: {
  lesson: { title: string; kind: string; duration: number | null; isPreview: boolean };
  done: boolean;
  previewLabel: string;
}) {
  const Icon = done ? CheckCircle2 : lesson.kind === "quiz" ? ListChecks : FileText;

  return (
    <>
      <Icon className={done ? "size-4 shrink-0 text-success" : "size-4 shrink-0"} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
      {lesson.isPreview ? <Badge variant="success">{previewLabel}</Badge> : null}
      {lesson.duration ? (
        <span className="tabular shrink-0 text-xs text-text-muted">{Math.round(lesson.duration / 60)} min</span>
      ) : null}
    </>
  );
}
