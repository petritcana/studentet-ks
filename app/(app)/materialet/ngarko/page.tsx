import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { UploadForm } from "@/components/materials/upload-form";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { CONTRIBUTION_XP, PRO_DAYS } from "@/lib/xp";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("material");
  return { title: t("upload") };
}

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const [me, locale, t] = await Promise.all([
    requireUser(),
    getLocale(),
    getTranslations("material"),
  ]);

  // Ngarkohet vetëm për lëndët e veta: një skriptë e vendosur te lënda e gabuar
  // e prish bibliotekën për të gjithë.
  const courses = await db.course.findMany({
    where: { enrollments: { some: { userId: me.id } } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, nameEn: true },
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text">{t("upload")}</h1>
        <p className="measure text-sm text-text-muted">{t("uploadBody", { xp: CONTRIBUTION_XP.materialApproved, days: PRO_DAYS.materialApproved })}</p>
      </header>

      <UploadForm
        courses={courses.map((course) => ({
          id: course.id,
          name: locale === "en" ? course.nameEn : course.name,
        }))}
      />
    </div>
  );
}
