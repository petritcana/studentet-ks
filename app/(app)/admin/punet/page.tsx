import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { JobClose } from "@/components/admin/job-close";
import { JobForm } from "@/components/admin/job-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminJobs");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

export default async function AdminJobsPage() {
  const [, locale, t, tt, tAdmin] = await Promise.all([
    requireAdmin(),
    getLocale(),
    getTranslations("adminJobs"),
    getTranslations("jobType"),
    getTranslations("admin"),
  ]);

  const now = new Date();
  const [companies, jobs] = await db.$transaction([
    db.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.jobPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        title: true,
        type: true,
        field: true,
        deadline: true,
        company: { select: { name: true } },
        _count: { select: { applications: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Link href="/admin" className="inline-flex w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="size-4" />
        {tAdmin("title")}
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text">{t("title")}</h1>
        <p className="measure text-sm text-text-muted">{t("subtitle")}</p>
      </header>

      <Card className="p-5">
        <JobForm companies={companies} />
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text">{t("publishedList")}</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-text-muted">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {jobs.map((job) => {
              const open = job.deadline >= now;
              return (
                <li key={job.id}>
                  <Card className="flex flex-wrap items-center gap-3 p-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="neutral">{tt(job.type)}</Badge>
                        <Badge variant="neutral">{job.field}</Badge>
                        {!open ? <Badge variant="neutral">{t("closedBadge")}</Badge> : null}
                      </div>
                      <Link href={`/karriera/${job.id}`} className="truncate text-sm font-medium text-text hover:underline">
                        {job.title}
                      </Link>
                      <p className="tabular text-xs text-text-muted">
                        {job.company.name} · {formatDate(job.deadline, locale)} ·{" "}
                        {t("applications", { count: job._count.applications })}
                      </p>
                    </div>
                    {open ? <JobClose id={job.id} /> : null}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
