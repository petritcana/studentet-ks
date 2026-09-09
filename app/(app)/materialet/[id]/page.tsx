import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Download, Star, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { MaterialRating } from "@/components/academic/material-rating";
import { MaterialWorkspace } from "@/components/academic/material-workspace";
import { SaveButton } from "@/components/shared/save-button";
import { ReportButton } from "@/components/shared/report-button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  MATERIAL_TYPE_LABELS,
  VERIFICATION_LABELS,
  type MaterialType,
  type VerificationStatus,
} from "@/lib/constants";
import { facultyTheme } from "@/lib/faculties";
import { formatDate } from "@/lib/format";
import { cn, formatBytes, formatNumber } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const material = await db.material.findUnique({
    where: { id },
    select: { title: true, course: { select: { name: true } } },
  });
  return {
    title: material?.title ?? "Materiali",
    description: material ? `${material.title} · ${material.course.name}` : undefined,
  };
}

export const dynamic = "force-dynamic";

/** Faqet e demonstrimit ndërtohen nga metadatat, që shikuesi të ketë përmbajtje reale. */
function buildPages(material: {
  title: string;
  description: string | null;
  professor: string | null;
  academicYear: string;
  pages: number | null;
  courseName: string;
}) {
  const total = Math.min(6, Math.max(3, Math.ceil((material.pages ?? 12) / 20)));

  return Array.from({ length: total }).map((_, index) => ({
    number: index + 1,
    heading:
      index === 0
        ? `${material.courseName}: hyrje dhe përmbajtje`
        : `${material.courseName}: kapitulli ${index}`,
    paragraphs:
      index === 0
        ? [
            `Ky material mbulon lëndën ${material.courseName} për vitin akademik ${material.academicYear}${material.professor ? `, sipas ligjëratave të ${material.professor}` : ""}.`,
            material.description ??
              "Ngarkuesi nuk ka lënë shënim shtesë. Krahasoje me skriptën zyrtare para provimit.",
            "Përmbajtja ndahet në kapituj që ndjekin rendin e ligjëratave. Nëse ndonjë pjesë mungon, shkruaje në komente dhe ngarkuesi e plotëson.",
          ]
        : [
            `Kapitulli ${index} trajton konceptet kryesore që dalin më shpesh në provim. Nis me përkufizimet, pastaj kalo te shembujt.`,
            "Shembujt e zgjidhur janë hapi ku shumica gabon. Ndiqe zgjidhjen hap pas hapi, jo vetëm rezultatin përfundimtar.",
            `Në fund të kapitullit ka ushtrime kontrolli. Nëse i zgjidh pa shikuar, je gati për këtë pjesë të ${material.courseName}.`,
          ],
  }));
}

export default async function MaterialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const material = await db.material.findUnique({
    where: { id },
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
      description: true,
      verificationStatus: true,
      isHidden: true,
      createdAt: true,
      uploaderId: true,
      course: {
        select: {
          id: true,
          name: true,
          code: true,
          department: {
            select: { name: true, faculty: { select: { name: true, color: true } } },
          },
        },
      },
      uploader: {
        select: { name: true, username: true, avatar: true, isVerified: true },
      },
      ratings: {
        where: { userId: user.id },
        select: { value: true },
      },
      _count: { select: { ratings: true } },
    },
  });

  if (!material) notFound();

  if (material.isHidden) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Materiali nuk shfaqet" back="/materialet" />
        <Card className="p-5">
          <p className="text-sm text-text">
            Ky material është fshehur derisa ta shikojë një moderator.
          </p>
          <p className="mt-2 text-sm text-text-muted">
            Kjo ndodh kur merr tri raportime ose kur bie nën dy yje me mbi pesë vlerësime.
          </p>
        </Card>
      </div>
    );
  }

  const theme = facultyTheme(material.course.department.faculty.color);
  const isUploader = material.uploaderId === user.id;
  const [saved, related] = await Promise.all([
    db.bookmark.findUnique({
      where: {
        userId_targetId_targetType: {
          userId: user.id,
          targetId: material.id,
          targetType: "material",
        },
      },
      select: { id: true },
    }),
    db.material.findMany({
      where: { courseId: material.course.id, id: { not: material.id }, isHidden: false },
      orderBy: { downloads: "desc" },
      take: 4,
      select: { id: true, title: true, type: true, downloads: true },
    }),
  ]);

  const pages = buildPages({
    title: material.title,
    description: material.description,
    professor: material.professor,
    academicYear: material.academicYear,
    pages: material.pages,
    courseName: material.course.name,
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={material.title} back={`/lenda/${material.course.id}`} />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn(theme.bg, theme.text, theme.border)}>
            {material.course.name}
          </Badge>
          <Badge>
            {MATERIAL_TYPE_LABELS[material.type as MaterialType] ?? material.type}
          </Badge>
          {material.verificationStatus === "verified" ? (
            <Badge variant="success">
              <BadgeCheck />
              {VERIFICATION_LABELS.verified}
            </Badge>
          ) : (
            <Badge variant="warning">
              {VERIFICATION_LABELS[material.verificationStatus as VerificationStatus] ??
                "Pa verifikuar"}
            </Badge>
          )}
          <Badge>{material.academicYear}</Badge>
        </div>

        {material.verificationStatus !== "verified" ? (
          <p className="mt-3 rounded-md border border-warning/30 bg-warning/8 p-3 text-sm text-text">
            Ky material s&apos;e ka kaluar ende kontrollin. Duhen tre vlerësime pozitive nga
            studentë të tjerë.
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-muted">
          <span className="tabular inline-flex items-center gap-1.5">
            <Star
              className={cn(
                "size-4",
                material.ratingCount > 0 ? "fill-warning text-warning" : "",
              )}
            />
            {material.ratingCount > 0
              ? `${material.rating.toFixed(1)} nga ${material.ratingCount}`
              : "pa vlerësim ende"}
          </span>
          <span className="tabular inline-flex items-center gap-1.5">
            <Download className="size-4" />
            {formatNumber(material.downloads)} shkarkime
          </span>
          <span className="tabular">
            {material.pages ? `${material.pages} faqe · ` : ""}
            {formatBytes(material.size)}
          </span>
          <span>{formatDate(material.createdAt)}</span>
        </div>

        {material.professor ? (
          <p className="mt-2 text-sm text-text-muted">Profesori: {material.professor}</p>
        ) : null}

        {material.description ? (
          <p className="measure mt-3 text-sm text-text">{material.description}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Button asChild>
            <a href={`/api/materialet/${material.id}/shkarko`} download>
              <Download />
              Shkarko
            </a>
          </Button>
          <SaveButton
            targetId={material.id}
            targetType="material"
            initialSaved={Boolean(saved)}
          />
          <ReportButton targetId={material.id} targetType="material" />
          <Link
            href={`/u/${material.uploader.username}`}
            className="ml-auto flex items-center gap-2"
          >
            <span className="text-right">
              <span className="block text-xs text-text-muted">Ngarkoi</span>
              <span className="block text-sm font-medium text-text">
                {material.uploader.name}
              </span>
            </span>
            <Avatar
              name={material.uploader.name}
              src={material.uploader.avatar}
              size="sm"
              verified={material.uploader.isVerified}
            />
          </Link>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold text-text">Vlerëso këtë material</h2>
        <p className="mt-1 text-xs text-text-muted">
          Vlerësimet e mbajnë cilësinë lart. Nën dy yje me mbi pesë vlerësime, materiali fshihet
          vetë.
        </p>
        <div className="mt-3">
          <MaterialRating
            materialId={material.id}
            initialValue={material.ratings[0]?.value ?? 0}
            disabled={isUploader}
            disabledHint="Materialin tënd nuk e vlerëson dot vetë."
          />
        </div>
      </Card>

      <MaterialWorkspace materialId={material.id} title={material.title} pages={pages} />

      {related.length > 0 ? (
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-brand-500" />
            <h2 className="text-sm font-semibold text-text">
              Të tjera për {material.course.name}
            </h2>
          </div>
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {related.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/materialet/${item.id}`}
                  className="flex items-center gap-3 py-2.5 first:pt-0"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-text">{item.title}</span>
                  <span className="tabular shrink-0 text-xs text-text-muted">
                    {formatNumber(item.downloads)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <p className="text-xs text-text-muted">
        Librat e plotë me të drejta autoriale nuk lejohen. Materialet e profesorëve publikohen
        vetëm me lejen e tyre ose si shënime të studentit. Kërkesat për heqje zgjidhen brenda 48
        orëve.
      </p>
    </div>
  );
}
