import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Download, MapPin, Wifi } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { JobFilters } from "@/components/academic/job-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { JOB_TYPES, JOB_TYPE_LABELS, type JobType } from "@/lib/constants";
import { deadlineLabel } from "@/lib/format";

export const metadata: Metadata = {
  title: "Punë dhe praktika",
  description: "Praktika, punë me gjysmë orari, bursa, konkurse dhe hackathone.",
};

export const dynamic = "force-dynamic";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ lloji?: string; qyteti?: string; fusha?: string; remote?: string }>;
}) {
  const params = await searchParams;
  await requireUser();

  const [jobs, cities, fields] = await Promise.all([
    db.jobPost.findMany({
      where: {
        ...(params.lloji ? { type: params.lloji } : {}),
        ...(params.qyteti ? { city: params.qyteti } : {}),
        ...(params.fusha ? { field: params.fusha } : {}),
        ...(params.remote === "po" ? { isRemote: true } : {}),
      },
      orderBy: { deadline: "asc" },
      take: 40,
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
        company: { select: { name: true, isVerified: true } },
      },
    }),
    db.jobPost.findMany({ select: { city: true }, distinct: ["city"] }),
    db.jobPost.findMany({ select: { field: true }, distinct: ["field"] }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Punë dhe praktika"
        description="Praktika, punë me gjysmë orari, bursa, konkurse, shkëmbime dhe hackathone."
        action={
          <Button asChild size="sm" variant="secondary">
            <a href="/api/cv" download>
              <Download />
              CV-ja ime
            </a>
          </Button>
        }
      />

      <JobFilters
        types={JOB_TYPES.map((type) => ({ value: type, label: JOB_TYPE_LABELS[type] }))}
        cities={cities.map((item) => item.city)}
        fields={fields.map((item) => item.field)}
      />

      {jobs.length === 0 ? (
        <EmptyState
          illustration="search"
          title="S'ka shpallje me këta filtra"
          description="Provo pa filtrin e qytetit, ose shiko edhe pozitat në distancë."
          action={
            <Button asChild variant="outline">
              <Link href="/pune">Pastro filtrat</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((job) => (
            <Card key={job.id} interactive className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="brand">
                  {JOB_TYPE_LABELS[job.type as JobType] ?? job.type}
                </Badge>
                <Badge>{job.field}</Badge>
                {job.isRemote ? (
                  <Badge variant="accent">
                    <Wifi />
                    Në distancë
                  </Badge>
                ) : null}
              </div>

              <h2 className="mt-2 text-sm font-semibold text-text">{job.title}</h2>

              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                <span className="inline-flex items-center gap-1">
                  {job.company.name}
                  {job.company.isVerified ? (
                    <BadgeCheck className="size-3.5 text-brand-500" />
                  ) : null}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" />
                  {job.city}
                </span>
              </p>

              <p className="measure mt-2 text-sm text-text-muted">{job.description}</p>

              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
                <Badge
                  variant={
                    new Date(job.deadline).getTime() - Date.now() < 5 * 86400000
                      ? "warning"
                      : "neutral"
                  }
                >
                  {deadlineLabel(job.deadline)}
                </Badge>
                {job.link ? (
                  <Button asChild size="sm" className="ml-auto">
                    <a href={job.link} target="_blank" rel="noopener noreferrer">
                      Apliko
                    </a>
                  </Button>
                ) : (
                  <span className="ml-auto text-xs text-text-muted">
                    Aplikimi bëhet drejtpërdrejt te kompania.
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
