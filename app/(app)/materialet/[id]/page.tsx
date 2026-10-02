import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DocumentViewer } from "@/components/materials/document-viewer";
import { MaterialRow } from "@/components/materials/material-row";
import { UserIdentityLine } from "@/components/identity/user-identity-line";
import { toPublicAuthor } from "@/lib/dto";
import { facultyStyle } from "@/lib/faculties";
import { formatBytes, formatDate, formatNumber } from "@/lib/format";
import { getMaterial, getRelatedMaterials } from "@/lib/queries/materials";
import { requireUser } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations("material");
  return { title: id ? t("viewer") : t("title") };
}

export const dynamic = "force-dynamic";

export default async function MaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, me, locale] = await Promise.all([params, requireUser(), getLocale()]);

  const material = await getMaterial(me.access, id, locale);
  if (!material) notFound();

  const [related, t, tm, tv] = await Promise.all([
    getRelatedMaterials(me.access, material, locale),
    getTranslations("material"),
    getTranslations("materialType"),
    getTranslations("verification"),
  ]);

  const ownFaculty =
    (locale === "en" ? me.faculty?.nameEn : me.faculty?.name) ?? me.university?.abbr ?? "";
  const locked = !material.access.allowed;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-2" style={facultyStyle(material.facultyCode)}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="faculty">{tm(material.type)}</Badge>
          <Badge variant={material.verificationStatus === "verified" ? "success" : "neutral"}>
            {tv(material.verificationStatus)}
          </Badge>
          <Link
            href={`/lenda/${material.course.id}`}
            className="text-xs text-text-muted hover:text-text"
          >
            {material.courseName}
          </Link>
        </div>

        <h1 className="text-pretty text-2xl font-semibold tracking-tight text-text">
          {material.title}
        </h1>

        <p className="tabular flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
          {material.facultyLabel ? <span>{material.facultyLabel}</span> : null}
          {material.pages ? <span>· {material.pages}</span> : null}
          <span>· {formatBytes(material.size)}</span>
          <span>
            · {t("downloads", { count: formatNumber(material.downloads, locale) })}
          </span>
          {material.ratingCount > 0 ? (
            <span>
              · {material.rating.toFixed(1)} ({material.ratingCount})
            </span>
          ) : (
            <span>· {t("noRating")}</span>
          )}
          <span>· {formatDate(material.createdAt, locale)}</span>
        </p>
      </header>

      {material.verificationStatus !== "verified" ? (
        <p className="rounded-md border border-warning/30 bg-warning/8 px-3 py-2 text-sm text-text">
          {t("notVerifiedYet")}
        </p>
      ) : null}

      <DocumentViewer
        materialId={material.id}
        title={material.title}
        pages={material.pages}
        locked={locked}
        facultyLabel={material.facultyLabel ?? ""}
        ownFaculty={ownFaculty}
        isOwn={material.uploaderId === me.id}
        myRating={material.myRating}
      />

      {material.description ? (
        <p className="measure whitespace-pre-wrap text-pretty text-sm text-text">
          {material.description}
        </p>
      ) : null}

      <Card className="flex flex-col gap-2 p-4">
        <p className="text-xs text-text-muted">{t("uploader")}</p>
        <UserIdentityLine user={toPublicAuthor(material.uploader, locale)} size="sm" />
        {material.professor ? (
          <p className="text-xs text-text-muted">
            {t("professor")}: {material.professor}
          </p>
        ) : null}
        <p className="tabular text-xs text-text-muted">
          {t("academicYear")}: {material.academicYear}
        </p>
      </Card>

      {related.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text">
            {t("related", { course: material.courseName })}
          </h2>
          <div className="flex flex-col gap-2">
            {related.map((item) => (
              <MaterialRow key={item.id} material={item} />
            ))}
          </div>
        </section>
      ) : null}

      <p className="text-xs text-text-muted">{t("legalNote")}</p>
    </div>
  );
}
