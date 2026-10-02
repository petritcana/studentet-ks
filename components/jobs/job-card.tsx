"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Bookmark, Building2, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { setApplicationState } from "@/lib/actions/career";
import { deadlineDays, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type JobDto = {
  id: string;
  title: string;
  type: string;
  field: string;
  city: string;
  isRemote: boolean;
  deadline: string;
  companyName: string;
  companyLogo: string | null;
  isVerified: boolean;
  saved: boolean;
  /** Fjalia e parë e shpalljes. Pa të, karta nuk thotë çfarë është puna. */
  summary?: string;
  /** Pse doli lart për këtë student. Bosh do të thotë thjesht afati. */
  reason?: "field" | "city" | "level" | null;
};

export function JobCard({ job, onSelect }: { job: JobDto; onSelect?: (job: JobDto) => void }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("career");
  const tt = useTranslations("jobType");
  const [saved, setSaved] = React.useState(job.saved);
  const [, startTransition] = React.useTransition();

  const days = deadlineDays(job.deadline);

  function save(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setSaved((value) => !value);

    startTransition(async () => {
      const result = await setApplicationState(job.id, "saved");
      if (!result.ok) {
        setSaved(job.saved);
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    });
  }

  const deadlineLabel =
    days < 0
      ? t("closed")
      : days === 0
        ? t("closesToday")
        : days === 1
          ? t("closesTomorrow")
          : days <= 14
            ? t("daysLeft", { count: days })
            : formatDate(job.deadline, locale);

  const handleClick = (e: React.MouseEvent) => {
    if (onSelect) {
      e.preventDefault();
      onSelect(job);
    }
  };

  return (
    <Card
      interactive
      className="group flex flex-col justify-between rounded-xl border border-border/80 bg-surface p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-soft"
    >
      <Link href={`/karriera/${job.id}`} onClick={handleClick} className="flex flex-col gap-3">
        {/* Rreshti i sipërm: Logoja dhe Kompania */}
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-border/80 bg-surface-2 text-text-muted ring-1 ring-border/30">
            {job.companyLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={job.companyLogo} alt="" className="size-full object-cover" />
            ) : (
              <Building2 className="size-5 text-text-muted" />
            )}
          </span>

          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-xs font-semibold text-text">{job.companyName}</span>
            <span className="flex items-center gap-1 text-[11px] text-text-muted">
              <MapPin className="size-2.5 shrink-0" />
              <span className="truncate">{job.isRemote ? t("remote") : job.city}</span>
            </span>
          </div>
        </div>

        {/* Titulli, përshkrimi dhe lloji */}
        <div className="flex flex-col gap-1.5">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-text transition-colors group-hover:text-brand-500">
            {job.title}
          </h3>

          {job.summary ? (
            <p className="line-clamp-2 text-[11px] leading-snug text-text-muted">{job.summary}</p>
          ) : null}

          {job.reason ? (
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-medium text-brand-600 dark:text-brand-400">
              <Sparkles className="size-2.5" />
              {t(`reason_${job.reason}`)}
            </span>
          ) : null}

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
            <span className="rounded bg-brand-500/10 px-1.5 py-0.5 font-medium text-brand-600 dark:text-brand-400">
              {tt(job.type)}
            </span>
            <span className={cn("tabular text-[11px]", days >= 0 && days <= 3 ? "font-semibold text-amber-600 dark:text-amber-400" : "text-text-muted")}>
              {deadlineLabel}
            </span>
          </div>
        </div>
      </Link>

      <div className="mt-3.5 flex items-center gap-2 border-t border-border/60 pt-3">
        <Button
          size="sm"
          variant={saved ? "secondary" : "ghost"}
          onClick={save}
          className="h-7 px-2.5 text-xs text-text-muted hover:text-text"
        >
          <Bookmark className={cn("size-3.5", saved && "fill-current text-brand-500")} />
          <span className="sr-only sm:not-sr-only sm:inline">{saved ? t("saved") : t("save")}</span>
        </Button>

        <Button asChild size="sm" variant="outline" className="ml-auto h-7 text-xs border-brand-500/30 px-3 hover:bg-brand-500 hover:text-white">
          <Link href={`/karriera/${job.id}`} onClick={handleClick}>
            {t("apply")}
          </Link>
        </Button>
      </div>
    </Card>
  );
}
