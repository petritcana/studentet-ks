import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { MaterialCard } from "@/components/academic/material-card";
import { LibraryFilters } from "@/components/academic/library-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SkeletonMaterial } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { facultyTheme } from "@/lib/faculties";
import { MATERIAL_TYPES, MATERIAL_TYPE_LABELS, type MaterialType } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Materialet",
  description: "Biblioteka e lëndëve: skripta, shënime, provime të kaluara dhe detyra.",
};

export const dynamic = "force-dynamic";

type SearchParams = {
  lenda?: string;
  lloj?: string;
  vit?: string;
  q?: string;
  fakulteti?: string;
};

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const user = await requireUser();

  const [faculties, myCourses] = await Promise.all([
    db.faculty.findMany({
      where: { university: { abbr: "UP" } },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
    db.enrollment.findMany({
      where: { userId: user.id },
      select: {
        course: {
          select: {
            id: true,
            name: true,
            code: true,
            year: true,
            _count: { select: { materials: true } },
          },
        },
      },
      orderBy: { course: { name: "asc" } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Materialet"
        description="Hierarkia është universiteti, fakulteti, lënda, lloji. Çdo material lidhet me lëndën, jo me një folder që humb."
        action={
          <Button asChild size="sm">
            <Link href="/materialet/ngarko">
              <Upload />
              Ngarko
            </Link>
          </Button>
        }
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">Lëndët e mia</h2>
        {myCourses.length === 0 ? (
          <EmptyState
            illustration="materials"
            compact
            title="Ende s'ke lëndë të zgjedhura"
            description="Shto lëndët e semestrit dhe biblioteka fillon të filtrohet vetë për ty."
            action={
              <Button asChild variant="outline">
                <Link href="/cilesimet">Shto lëndët</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {myCourses.map(({ course }) => (
              <Link key={course.id} href={`/lenda/${course.id}`}>
                <Card interactive className="p-3">
                  <p className="truncate text-sm font-medium text-text">{course.name}</p>
                  <p className="mt-0.5 truncate text-xs text-text-muted">
                    {course.code} · {course._count.materials} materiale
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <LibraryFilters
        faculties={faculties.map((faculty) => ({
          id: faculty.id,
          label: facultyTheme(faculty.color).shortLabel,
          color: faculty.color,
        }))}
        types={MATERIAL_TYPES.map((type) => ({
          value: type,
          label: MATERIAL_TYPE_LABELS[type as MaterialType],
        }))}
      />

      <Suspense fallback={<LibrarySkeleton />} key={JSON.stringify(params)}>
        <MaterialResults params={params} />
      </Suspense>
    </div>
  );
}

function LibrarySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <SkeletonMaterial key={index} />
      ))}
    </div>
  );
}

async function MaterialResults({ params }: { params: SearchParams }) {
  const materials = await db.material.findMany({
    where: {
      isHidden: false,
      ...(params.lloj ? { type: params.lloj } : {}),
      ...(params.vit ? { academicYear: { contains: params.vit } } : {}),
      ...(params.q ? { title: { contains: params.q } } : {}),
      ...(params.fakulteti
        ? { course: { department: { facultyId: params.fakulteti } } }
        : {}),
      ...(params.lenda ? { courseId: params.lenda } : {}),
    },
    orderBy: [{ verificationStatus: "asc" }, { downloads: "desc" }],
    take: 40,
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
      uploader: {
        select: { name: true, username: true, avatar: true, isVerified: true },
      },
    },
  });

  if (materials.length === 0) {
    return (
      <EmptyState
        illustration="search"
        title="S'gjetëm materiale me këto filtra"
        description="Provo pa filtrin e llojit, ose kërko emrin e lëndës ashtu si shkruhet në silabus."
        action={
          <Button asChild variant="outline">
            <Link href="/materialet">Pastro filtrat</Link>
          </Button>
        }
      />
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-text">
          Rezultatet ({materials.length})
        </h2>
        <Badge variant="neutral">Të verifikuarat dalin të parat</Badge>
      </div>
      <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2")}>
        {materials.map((material) => (
          <MaterialCard key={material.id} material={material} />
        ))}
      </div>
    </section>
  );
}
