import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { UploadForm } from "@/components/academic/upload-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Ngarko material",
  description: "Skripta, shënime, provime të kaluara ose detyra të zgjidhura.",
};

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ lenda?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();

  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id },
    select: {
      course: { select: { id: true, name: true, code: true, professor: true } },
    },
    orderBy: { course: { name: "asc" } },
  });

  const courses = enrollments.map((item) => item.course);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Ngarko material"
        description="Materiali hyn si i paverifikuar derisa ta vlerësojnë tre studentë. Kjo e mban cilësinë lart pa e ngadalësuar askënd."
        back="/materialet"
      />

      {courses.length === 0 ? (
        <EmptyState
          illustration="materials"
          title="Së pari zgjidh lëndët e tua"
          description="Materiali lidhet gjithmonë me një lëndë. Shto lëndët e semestrit dhe kthehu këtu."
          action={
            <Button asChild>
              <Link href="/cilesimet">Shto lëndët</Link>
            </Button>
          }
        />
      ) : (
        <UploadForm courses={courses} defaultCourseId={params.lenda} />
      )}
    </div>
  );
}
