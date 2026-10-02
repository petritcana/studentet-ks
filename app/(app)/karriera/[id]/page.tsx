import type { Metadata } from "next";
import { recordJobView } from "@/lib/job-recommend";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Building2, ExternalLink, FileText, Globe, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { deadlineDays, formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await db.jobPost.findUnique({ where: { id }, select: { title: true } });
  return { title: job?.title ?? "" };
}

export const dynamic = "force-dynamic";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, me, locale] = await Promise.all([params, requireUser(), getLocale()]);

  const job = await db.jobPost.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      type: true,
      field: true,
      city: true,
      isRemote: true,
      description: true,
      deadline: true,
      link: true,
      company: {
        select: { name: true, description: true, website: true, city: true, isVerified: true },
      },
    },
  });
  if (!job) notFound();
  // Hapja e shpalljes ushqen «Mundësi për ty»: kjo është çfarë kërkon studenti.
  await recordJobView(me.id, job).catch(() => undefined);

  const [t, tt] = await Promise.all([getTranslations("jobs"), getTranslations("jobType")]);
  const days = deadlineDays(job.deadline);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">{tt(job.type)}</Badge>
          {job.isRemote ? <Badge variant="neutral">{t("remote")}</Badge> : null}
          {job.company.isVerified ? <Badge variant="success">{job.company.name}</Badge> : null}
        </div>

        <h1 className="text-pretty text-2xl font-semibold tracking-tight text-text">{job.title}</h1>

        <p className="tabular flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1">
            <Building2 className="size-3" />
            {job.company.name}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" />
            {job.city}
          </span>
          <span>{job.field}</span>
        </p>

        <p className={days <= 2 ? "text-sm font-medium text-warning-text" : "text-sm text-text-muted"}>
          {days < 0
            ? t("deadlinePassed")
            : days === 0
              ? t("deadlineToday")
              : days === 1
                ? t("deadlineTomorrow")
                : t("deadlineDate", { date: formatDate(job.deadline, locale) })}
        </p>
      </header>

      <p className="measure whitespace-pre-wrap text-pretty text-sm text-text">{job.description}</p>

      <Card className="flex flex-col gap-2 p-4">
        <p className="text-sm font-semibold text-text">{job.company.name}</p>
        <p className="measure text-sm text-text-muted">{job.company.description}</p>
        {job.company.website ? (
          <a
            href={job.company.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 text-sm text-brand-500 hover:underline"
          >
            <Globe className="size-3.5" />
            {job.company.website}
          </a>
        ) : null}
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {job.link && days >= 0 ? (
          <Button asChild>
            <a href={job.link} target="_blank" rel="noopener noreferrer">
              {t("apply")}
              <ExternalLink />
            </a>
          </Button>
        ) : null}
        <Button asChild variant="secondary">
          <Link href="/karriera/cv">
            <FileText />
            {t("cv")}
          </Link>
        </Button>
      </div>

      <p className="text-xs text-text-muted">{t("applyDirect")}</p>
    </div>
  );
}
