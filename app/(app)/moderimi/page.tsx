import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { FileCheck2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedNav } from "@/components/shared/segmented-nav";
import { MaterialQueue } from "@/components/moderation/material-queue";
import { VerificationQueue } from "@/components/moderation/verification-queue";
import { ReportQueue, type ReportItem } from "@/components/moderation/report-queue";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireModerator } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("moderation");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/** Merr copëzën e përmbajtjes së raportuar, që vendimi të merret me kontekst. */
async function loadTarget(targetId: string, targetType: string) {
  if (targetType === "post") {
    const post = await db.post.findUnique({
      where: { id: targetId },
      select: { text: true, isHidden: true },
    });
    return post ? { excerpt: post.text, isHidden: post.isHidden, href: `/postimi/${targetId}` } : null;
  }
  if (targetType === "comment") {
    const comment = await db.comment.findUnique({
      where: { id: targetId },
      select: { text: true, isHidden: true, postId: true },
    });
    return comment
      ? { excerpt: comment.text, isHidden: comment.isHidden, href: `/postimi/${comment.postId}` }
      : null;
  }
  if (targetType === "material") {
    const material = await db.material.findUnique({
      where: { id: targetId },
      select: { title: true, isHidden: true },
    });
    return material
      ? { excerpt: material.title, isHidden: material.isHidden, href: `/materialet/${targetId}` }
      : null;
  }
  if (targetType === "question") {
    const question = await db.question.findUnique({
      where: { id: targetId },
      select: { title: true, isHidden: true },
    });
    return question
      ? { excerpt: question.title, isHidden: question.isHidden, href: `/pyetje/${targetId}` }
      : null;
  }
  if (targetType === "answer") {
    const answer = await db.answer.findUnique({
      where: { id: targetId },
      select: { text: true, isHidden: true, questionId: true },
    });
    return answer
      ? { excerpt: answer.text, isHidden: answer.isHidden, href: `/pyetje/${answer.questionId}` }
      : null;
  }
  return null;
}

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [, locale, params, t] = await Promise.all([
    requireModerator(),
    getLocale(),
    searchParams,
    getTranslations("moderation"),
  ]);

  const tv = await getTranslations("verify");

  const tab = params.tab ?? "raportet";

  const [rawReports, pendingMaterials, counts] = await Promise.all([
    db.report.findMany({
      where: { status: { in: ["open", "reviewing"] } },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        reason: true,
        note: true,
        status: true,
        createdAt: true,
        targetId: true,
        targetType: true,
      },
    }),
    db.material.findMany({
      where: { verificationStatus: "pending", isHidden: false },
      orderBy: { createdAt: "asc" },
      take: 30,
      select: {
        id: true,
        title: true,
        type: true,
        size: true,
        pages: true,
        createdAt: true,
        course: { select: { name: true, nameEn: true } },
        uploader: { select: { name: true, username: true } },
      },
    }),
    db.report.groupBy({ by: ["status"], _count: { status: true } }),
  ]);

  // Radha e verifikimeve: vetëm ato që kane kaluar hapin e emailit dhe presin sy njeriu.
  const pendingVerifications = await db.verification.findMany({
    // Vetëm kërkesat me foto: emaili i konfirmuar pa ID nuk ka çfarë të shqyrtohet.
    where: { status: "pending", idDocumentRef: { not: null } },
    orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
    take: 30,
    select: {
      id: true,
      kind: true,
      createdAt: true,
      emailVerifiedAt: true,
      idDocumentRef: true,
      selfieRef: true,
      note: true,
      submittedAt: true,
      user: {
        select: {
          name: true,
          username: true,
          email: true,
          studentEmail: true,
          birthDate: true,
          faculty: { select: { name: true, nameEn: true } },
          university: { select: { name: true, nameEn: true } },
        },
      },
    },
  });

  // Raportet mbi të njëjtën përmbajtje bashkohen: një vendim i mbyll të gjitha.
  const grouped = new Map<string, ReportItem>();
  for (const report of rawReports) {
    const key = `${report.targetType}:${report.targetId}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }

    const target = await loadTarget(report.targetId, report.targetType);
    grouped.set(key, {
      id: report.id,
      reason: report.reason,
      note: report.note,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
      count: 1,
      targetType: report.targetType,
      targetId: report.targetId,
      href: target?.href ?? null,
      excerpt: target?.excerpt?.slice(0, 400) ?? null,
      isHidden: target?.isHidden ?? false,
    });
  }

  const open = counts.find((row) => row.status === "open")?._count.status ?? 0;
  const actioned = counts.find((row) => row.status === "actioned")?._count.status ?? 0;
  const dismissed = counts.find((row) => row.status === "dismissed")?._count.status ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-text">
            <ShieldCheck className="size-5 text-brand-500" />
            {t("title")}
          </h1>
          <p className="measure text-sm text-text-muted">{t("subtitle")}</p>
        </div>
        <Button asChild size="sm" variant="secondary">
          <Link href="/moderimi/raporti">{t("publicTitle")}</Link>
        </Button>
      </header>

      <Card className="tabular flex flex-wrap items-center gap-4 p-4 text-sm">
        <span>
          <Badge variant="warning">{open}</Badge> {t("open")}
        </span>
        <span>
          <Badge variant="danger">{actioned}</Badge> {t("actioned")}
        </span>
        <span>
          <Badge variant="neutral">{dismissed}</Badge> {t("dismissed")}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <FileCheck2 className="size-4 text-text-muted" />
          <Badge variant="brand">{pendingMaterials.length}</Badge>
        </span>
      </Card>

      <SegmentedNav
        base="/moderimi"
        active={tab}
        items={[
          { value: "raportet", label: t("open"), count: grouped.size },
          { value: "materialet", label: t("reviewing"), count: pendingMaterials.length },
          { value: "verifikimet", label: tv("queue"), count: pendingVerifications.length },
        ]}
      />

      {tab === "verifikimet" ? (
        <VerificationQueue
          items={pendingVerifications.map((item) => ({
            id: item.id,
            kind: item.kind,
            createdAt: (item.submittedAt ?? item.createdAt).toISOString(),
            emailConfirmed: Boolean(item.emailVerifiedAt),
            hasDocuments: Boolean(item.idDocumentRef),
            idDocumentUrl: item.idDocumentRef,
            note: item.note,
            userName: item.user.name,
            userUsername: item.user.username,
            userEmail: item.user.studentEmail ?? item.user.email,
            birthLabel: item.user.birthDate ? formatDate(item.user.birthDate, locale) : null,
            universityLabel:
              locale === "en" ? item.user.university?.nameEn ?? null : item.user.university?.name ?? null,
            facultyLabel:
              locale === "en" ? item.user.faculty?.nameEn ?? null : item.user.faculty?.name ?? null,
          }))}
        />
      ) : tab === "materialet" ? (
        <MaterialQueue
          materials={pendingMaterials.map((material) => ({
            id: material.id,
            title: material.title,
            type: material.type,
            size: material.size,
            pages: material.pages,
            createdAt: material.createdAt.toISOString(),
            courseName: locale === "en" ? material.course.nameEn : material.course.name,
            uploaderName: material.uploader.name,
            uploaderUsername: material.uploader.username,
          }))}
        />
      ) : (
        <ReportQueue reports={[...grouped.values()]} />
      )}
    </div>
  );
}
