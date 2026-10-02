import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LessonQuiz } from "@/components/courses/lesson-quiz";
import { CompleteLessonButton } from "@/components/courses/complete-lesson-button";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}): Promise<Metadata> {
  const { lessonId } = await params;
  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, select: { title: true } });
  return { title: lesson?.title ?? "" };
}

export const dynamic = "force-dynamic";

type QuizQuestion = { question: string; options: string[]; answer: number };

function parseQuiz(raw: string): QuizQuestion[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const [{ id, lessonId }, me, t] = await Promise.all([params, requireUser(), getTranslations("courses")]);

  const course = await db.onlineCourse.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      instructorId: true,
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, kind: true, content: true, isPreview: true },
          },
        },
      },
    },
  });
  if (!course) notFound();

  const lessons = course.sections.flatMap((section) => section.lessons);
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  if (index === -1) notFound();
  const lesson = lessons[index];

  const [enrolment, progress] = await Promise.all([
    db.courseEnrollment.findUnique({
      where: { courseId_userId: { courseId: id, userId: me.id } },
      select: { id: true },
    }),
    db.lessonProgress.findMany({
      where: { userId: me.id, completed: true, lessonId: { in: lessons.map((item) => item.id) } },
      select: { lessonId: true },
    }),
  ]);

  const isOwner = course.instructorId === me.id;
  const enrolled = Boolean(enrolment);
  const canOpen = (item: { isPreview: boolean }) => enrolled || isOwner || item.isPreview;

  // Qasja kontrollohet këtu, jo te lista: një lidhje e kopjuar nuk e hap mësimin.
  if (!canOpen(lesson)) redirect(`/kurset/${id}`);

  const done = new Set(progress.map((row) => row.lessonId));
  const previous = lessons[index - 1];
  const next = lessons[index + 1];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <Link
          href={`/kurset/${id}`}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft className="size-4" />
          {course.title}
        </Link>

        <h1 className="text-pretty text-2xl font-semibold tracking-tight text-text">{lesson.title}</h1>

        <Card className="p-5">
          {lesson.kind === "quiz" ? (
            <LessonQuiz questions={parseQuiz(lesson.content)} />
          ) : lesson.kind === "video" && lesson.content.startsWith("/api/media/") ? (
            <video src={lesson.content} controls playsInline className="w-full rounded-md" />
          ) : (
            <LessonText body={lesson.content} />
          )}
        </Card>

        <div className="flex flex-wrap items-center gap-2">
          {previous && canOpen(previous) ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/kurset/${id}/mesimi/${previous.id}`}>
                <ArrowLeft />
                {t("previousLesson")}
              </Link>
            </Button>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            {enrolled ? <CompleteLessonButton lessonId={lesson.id} completed={done.has(lesson.id)} /> : null}

            {next && canOpen(next) ? (
              <Button asChild size="sm" variant={enrolled ? "secondary" : "primary"}>
                <Link href={`/kurset/${id}/mesimi/${next.id}`}>
                  {t("nextLesson")}
                  <ArrowRight />
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        {!enrolled && !isOwner ? (
          <p className="text-sm text-text-muted">
            {t("previewNotice")}{" "}
            <Link href={`/kurset/${id}`} className="text-brand-500 hover:underline">
              {t("enrollToContinue")}
            </Link>
          </p>
        ) : null}
      </div>

      <aside className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
        {course.sections.map((section) => (
          <Card key={section.id} className="flex flex-col gap-1.5 p-3">
            <p className="px-1 text-xs font-medium text-text-muted">{section.title}</p>
            <ul className="flex flex-col">
              {section.lessons.map((item) => {
                const open = canOpen(item);
                const current = item.id === lesson.id;
                const Icon = done.has(item.id) ? CheckCircle2 : open ? Circle : Lock;

                const row = (
                  <span
                    className={cn(
                      "flex items-center gap-2 rounded-md px-1.5 py-1.5 text-sm",
                      current ? "bg-surface-2 text-text" : open ? "text-text-muted" : "text-text-muted/60",
                    )}
                  >
                    <Icon
                      className={cn("size-4 shrink-0", done.has(item.id) && "text-success")}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  </span>
                );

                return (
                  <li key={item.id}>
                    {open && !current ? (
                      <Link href={`/kurset/${id}/mesimi/${item.id}`} className="block hover:text-text">
                        {row}
                      </Link>
                    ) : (
                      row
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </aside>
    </div>
  );
}

// Paragrafët ndahen me rresht bosh. Një paragraf me rreshta të futur është kod.
function LessonText({ body }: { body: string }) {
  const blocks = body.split(/\n{2,}/);

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) =>
        block.includes("\n") && /\n {2,}/.test(block) ? (
          <pre
            key={index}
            className="overflow-x-auto rounded-md bg-surface-2 p-3 font-mono text-[13px] leading-relaxed text-text"
          >
            {block}
          </pre>
        ) : (
          <p key={index} className="measure whitespace-pre-wrap text-pretty text-[15px] leading-relaxed text-text">
            {block}
          </p>
        ),
      )}
    </div>
  );
}
