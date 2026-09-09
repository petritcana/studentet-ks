import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { QuestionForm } from "@/components/academic/question-form";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Bëj një pyetje",
  description: "Pyetja shkon te lënda dhe te ata që e kanë kaluar atë provim.",
};

export default async function NewQuestionPage({
  searchParams,
}: {
  searchParams: Promise<{ lenda?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();

  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id },
    select: { course: { select: { id: true, name: true, code: true } } },
    orderBy: { course: { name: "asc" } },
  });

  const courses = enrollments.map((item) => item.course);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Bëj një pyetje"
        description="Pa përgjigje pas gjashtë orësh, pyetja u dërgohet pesë studentëve që e kanë kaluar këtë lëndë me sukses."
        back="/pyetje"
      />

      {courses.length === 0 ? (
        <EmptyState
          illustration="materials"
          title="Së pari zgjidh lëndët e tua"
          description="Pyetja lidhet gjithmonë me një lëndë, që të shkojë te njerëzit e duhur."
          action={
            <Button asChild>
              <Link href="/cilesimet">Shto lëndët</Link>
            </Button>
          }
        />
      ) : (
        <QuestionForm courses={courses} defaultCourseId={params.lenda} />
      )}
    </div>
  );
}
