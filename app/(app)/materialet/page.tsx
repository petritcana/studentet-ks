import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { SegmentedNav } from "@/components/shared/segmented-nav";
import { MaterialFiltersBar } from "@/components/materials/material-filters";
import { MaterialRow } from "@/components/materials/material-row";
import { db } from "@/lib/db";
import { getMaterials } from "@/lib/queries/materials";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("material");
  return { title: t("title"), description: t("subtitle") };
}

export const dynamic = "force-dynamic";

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; lenda?: string; lloji?: string }>;
}) {
  const [me, locale, params, t, te] = await Promise.all([
    requireUser(),
    getLocale(),
    searchParams,
    getTranslations("material"),
    getTranslations("empty"),
  ]);

  const scope =
    params.tab === "krejt" ? "all" : ("faculty" as const);

  const [materials, courses] = await Promise.all([
    getMaterials(
      { ...me.access, courseIds: me.courseIds },
      { q: params.q, courseId: params.lenda, type: params.lloji, scope },
      locale,
    ),
    db.course.findMany({
      where: { enrollments: { some: { userId: me.id } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, nameEn: true },
    }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-text">{t("title")}</h1>
          <p className="measure text-sm text-text-muted">{t("subtitle")}</p>
        </div>
        <Button asChild size="sm">
          <Link href="/materialet/ngarko">
            <Upload />
            {t("upload")}
          </Link>
        </Button>
      </header>

      {/*
        Dy shtrirje, jo tri.

        «Lëndët e mia» kërkonte që studenti të kishte zgjedhur lëndët një nga
        një, dhe pa atë hap skeda dilte bosh dhe dukej si e prishur. Fakulteti e
        mbulon të njëjtën nevojë pa kërkuar asgjë paraprakisht.
      */}
      <SegmentedNav
        base="/materialet"
        active={params.tab ?? "fakulteti"}
        items={[
          { value: "fakulteti", label: t("facultyScope") },
          { value: "krejt", label: t("allScope") },
        ]}
      />

      <MaterialFiltersBar
        courses={courses.map((course) => ({
          id: course.id,
          name: locale === "en" ? course.nameEn : course.name,
        }))}
      />

      <p className="text-xs text-text-muted">{t("verifiedFirst")}</p>

      {materials.length === 0 ? (
        <EmptyState
          illustration="materials"
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
    </div>
  );
}
