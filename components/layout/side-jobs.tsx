import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Briefcase } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getRecommendedJobs } from "@/lib/queries/jobs";
import { cn, initialsOf } from "@/lib/utils";

/** Pllaka e kompanisë merr ngjyrat me radhë: vjollcë, qelibar, gurkali. */
const TILE_TONES = [
  "bg-cat-violet-bg text-cat-violet",
  "bg-cat-amber-bg text-cat-amber",
  "bg-cat-teal-bg text-cat-teal",
] as const;

/** Mundësitë e punës në shtyllën e majtë: tri, me lidhje te Karriera. */
export async function SideJobs({
  user,
}: {
  user: { id: string; facultyId: string | null; city: string | null };
}) {
  const [jobs, t, tt, tc] = await Promise.all([
    getRecommendedJobs(user, 3),
    getTranslations("career"),
    getTranslations("jobType"),
    getTranslations("common"),
  ]);
  if (jobs.length === 0) return null;

  return (
    <Card className="flex flex-col gap-1.5 p-[18px]">
      <p className="mb-1 flex items-center gap-2.5 text-[15.5px] font-bold text-text">
        <Briefcase className="size-[19px] text-brand-500" />
        {t("opportunitiesTitle")}
      </p>

      <ul className="flex flex-col gap-0.5">
        {jobs.map((job, index) => (
          <li key={job.id}>
            <Link
              href={`/karriera/${job.id}`}
              className={cn(
                "flex items-start gap-3 rounded-[12px] px-2.5 py-[11px] transition-colors duration-150 hover:bg-surface-2",
                index === 0 && "bg-surface-2",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-[11px] text-[11px] font-bold",
                  TILE_TONES[index % TILE_TONES.length],
                )}
              >
                {initialsOf(job.companyName)}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="line-clamp-2 text-sm font-semibold leading-[1.35] text-text">{job.title}</span>
                <span className="text-[12.5px] text-text-muted">
                  {job.companyName} · {tt(job.type)} · {job.isRemote ? t("remote") : job.city}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="/karriera"
        className="inline-flex items-center gap-1.5 self-start px-2.5 pt-2 text-[13.5px] font-semibold text-brand-500 hover:underline"
      >
        {tc("seeAll")}
        <ArrowRight className="size-4" />
      </Link>
    </Card>
  );
}
