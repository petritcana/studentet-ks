import type { Metadata } from "next";
import { recordJobFilter } from "@/lib/job-recommend";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { SegmentedNav } from "@/components/shared/segmented-nav";
import { ApplicationTracker, type ApplicationRow } from "@/components/jobs/application-tracker";
import { JobCard, type JobDto } from "@/components/jobs/job-card";
import { ScholarshipCard } from "@/components/jobs/scholarship-card";
import { ContextRail } from "@/components/layout/context-rail";
import { PageWithRail } from "@/components/layout/page-with-rail";
import type { ApplicationState } from "@/lib/constants";
import { JobFilters } from "@/components/jobs/job-filters";
import { db } from "@/lib/db";
import { jobFacets, searchJobs } from "@/lib/queries/jobs";
import { requireUser } from "@/lib/session";

const TABS = ["pune", "praktika", "bursa", "aplikimet", "profili"] as const;
type CareerTab = (typeof TABS)[number];

const INTERNSHIP_TYPES = ["internship", "part_time"];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("career");
  return { title: t("title"), description: t("subtitle") };
}

export const dynamic = "force-dynamic";

export default async function CareerPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    lloji?: string;
    fusha?: string;
    qyteti?: string;
    larg?: string;
  }>;
}) {
  const [me, params, t] = await Promise.all([
    requireUser(),
    searchParams,
    getTranslations("career"),
  ]);

  const tab = (TABS.includes(params.tab as CareerTab) ? params.tab : "pune") as CareerTab;
  // Filtrat e fushës dhe llojit thonë çfarë kërkon studenti: ushqejnë «Mundësi për ty».
  await recordJobFilter(me.id, { field: params.fusha ?? null, type: params.lloji ?? null }).catch(() => undefined);

  /*
    Renditja niset nga profili akademik i studentit.

    Filtrat e zgjedhura janë absolutë; kur nuk ka asnjë, rendi vjen nga fakulteti,
    programi, qyteti dhe viti. Kështu praktika e duhur nuk fshihet nën dhjetë
    shpallje të një fushe tjetër.
  */
  const viewer = {
    facultyName: me.faculty?.name ?? null,
    programName: me.studyProgram?.name ?? null,
    city: me.city,
    year: me.year,
    level: me.level,
  };

  const [jobs, applications, facets] = await Promise.all([
    tab === "bursa" || tab === "aplikimet" || tab === "profili"
      ? Promise.resolve([])
      : searchJobs(viewer, {
          type: tab === "praktika" ? undefined : params.lloji,
          field: params.fusha,
          city: params.qyteti,
          remote: params.larg === "po",
        }).then((rows) =>
          tab === "praktika"
            ? rows.filter((job) => INTERNSHIP_TYPES.includes(job.type))
            : rows,
        ),
    db.application.findMany({
      where: { userId: me.id },
      orderBy: { updatedAt: "desc" },
      select: {
        jobId: true,
        status: true,
        job: {
          select: {
            title: true,
            city: true,
            deadline: true,
            company: { select: { name: true } },
          },
        },
      },
    }),
    jobFacets(),
  ]);

  const trackedIds = new Set(applications.map((item) => item.jobId));

  const cards: JobDto[] = jobs.map((job) => ({
    id: job.id,
    title: job.title,
    type: job.type,
    field: job.field,
    city: job.city,
    isRemote: job.isRemote,
    deadline: job.deadline.toISOString(),
    companyName: job.company.name,
    companyLogo: job.company.logo,
    isVerified: job.company.isVerified,
    saved: trackedIds.has(job.id),
    summary: job.description.split(/(?<=[.!?])\s/)[0]?.slice(0, 140) ?? "",
    reason: job.reason,
  }));

  const rows: ApplicationRow[] = applications.map((item) => ({
    jobId: item.jobId,
    title: item.job.title,
    company: item.job.company.name,
    city: item.job.city,
    status: item.status as ApplicationState,
    deadline: item.job.deadline.toISOString(),
  }));

  return (
    <PageWithRail rail={<ContextRail page="career" user={me} />}>
      <div className="flex flex-col gap-5">
        <header className="flex flex-wrap items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-text">{t("title")}</h1>
            <p className="measure text-sm text-text-muted">{t("subtitle")}</p>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link href="/karriera/cv">
              <FileText />
              {t("tabProfile")}
            </Link>
          </Button>
        </header>

        <SegmentedNav
          base="/karriera"
          active={tab}
          items={[
            { value: "pune", label: t("tabJobs") },
            { value: "praktika", label: t("tabInternships") },
            { value: "bursa", label: t("tabScholarships") },
            { value: "aplikimet", label: t("tabApplications"), count: rows.length },
            { value: "profili", label: t("profileTitle") },
          ]}
        />

        {tab === "aplikimet" ? (
          <ApplicationTracker rows={rows} />
        ) : tab === "bursa" ? (
          <ScholarshipList />
        ) : tab === "profili" ? (
          <CareerProfileLink />
        ) : (
          <>
            {tab === "pune" ? <JobFilters fields={facets.fields} cities={facets.cities} /> : null}

            {cards.length === 0 ? (
              <EmptyState
                illustration="search"
                title={t("empty")}
                description={t("subtitle")}
                action={
                  <Button asChild size="sm">
                    <Link href="/karriera">{t("emptyCta")}</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PageWithRail>
  );
}

async function ScholarshipList() {
  const [scholarships, t] = await Promise.all([
    db.scholarship.findMany({
      where: { isActive: true, deadline: { gte: new Date() } },
      orderBy: { deadline: "asc" },
      take: 24,
    }),
    getTranslations("career"),
  ]);

  if (scholarships.length === 0) {
    return <EmptyState illustration="search" title={t("scholarshipsEmpty")} />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {scholarships.map((item) => (
        <ScholarshipCard
          key={item.id}
          scholarship={{ ...item, deadline: item.deadline.toISOString() }}
        />
      ))}
    </div>
  );
}

async function CareerProfileLink() {
  const t = await getTranslations("career");

  return (
    <EmptyState
      illustration="people"
      title={t("profileTitle")}
      description={t("profileBody")}
      action={
        <Button asChild size="sm">
          <Link href="/karriera/profili">{t("saveProfile")}</Link>
        </Button>
      }
    />
  );
}
