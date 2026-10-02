"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Bookmark, ExternalLink, Flag, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { setApplicationState } from "@/lib/actions/career";
import { formatDateShort } from "@/lib/format";
import type { JobDto } from "./job-card";
import { cn } from "@/lib/utils";

type JobDetail = {
  description: string | null;
  requirements: string | null;
  skills: string[];
  salary: string | null;
};

export function JobDrawer({ job, onClose }: { job: JobDto | null; onClose: () => void }) {
  const locale = useLocale();
  const t = useTranslations("career");
  const tt = useTranslations("jobType");
  const tc = useTranslations("common");

  const [detail, setDetail] = React.useState<JobDetail | null>(null);
  const [saving, startSaving] = React.useTransition();

  React.useEffect(() => {
    if (!job) {
      setDetail(null);
      return;
    }

    let cancelled = false;

    // Detajet merren vetëm kur sirtari hapet vërtet: karta në karusel nuk ka
    // nevojë për tekstin e plotë, dhe marrja e tij për çdo shpallje do të ishte
    // punë e kotë për shumicën që nuk hapet kurrë.
    (async () => {
      const response = await fetch(`/api/pune/${job.id}`);
      if (!response.ok) return;
      const data = await response.json();
      if (!cancelled) setDetail(data);
    })();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [job, onClose]);

  if (!job) return null;

  function save() {
    startSaving(async () => {
      const result = await setApplicationState(job!.id, "saved");
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      toast.success(t("saved"));
    });
  }

  async function share() {
    const url = `${window.location.origin}/karriera/${job!.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("linkCopied"));
    } catch {
      toast.error(tc("retry"));
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex" role="dialog" aria-modal="true" aria-label={job.title}>
      <button
        type="button"
        aria-label={tc("close")}
        onClick={onClose}
        className="absolute inset-0 bg-bg/70 backdrop-blur-sm"
      />

      <div
        className={cn(
          "relative ml-auto flex w-full flex-col overflow-y-auto border-border bg-surface-solid shadow-lifted",
          // Celular: fletë nga poshtë. Desktop: sirtar nga e djathta.
          "mt-auto max-h-[88dvh] rounded-t-xl border-t",
          "sm:mt-0 sm:max-h-none sm:h-full sm:max-w-md sm:rounded-none sm:border-l sm:border-t-0",
        )}
      >
        <header className="flex shrink-0 items-start gap-2 border-b border-border p-4">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            {job.companyLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={job.companyLogo} alt="" className="size-10 shrink-0 rounded-md object-cover" />
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-2 text-xs font-semibold text-text-muted">
                {job.companyName.slice(0, 2).toUpperCase()}
              </span>
            )}

            <div className="flex min-w-0 flex-col">
              <h2 className="text-base font-semibold text-text">{job.title}</h2>
              <p className="truncate text-sm text-text-muted">{job.companyName}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={tc("close")}
            className="grid size-8 shrink-0 place-items-center rounded-full text-text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex flex-col gap-4 p-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Fact label={t("jobType")} value={tt(job.type)} />
            <Fact label={t("location")} value={job.isRemote ? t("remote") : job.city} />
            <Fact label={t("deadline")} value={formatDateShort(job.deadline, locale)} />
            {detail?.salary ? <Fact label={t("salary")} value={detail.salary} /> : null}
          </dl>

          {detail === null ? (
            <div className="flex flex-col gap-2" aria-hidden>
              <span className="h-3 w-2/3 animate-pulse rounded-sm bg-surface-2" />
              <span className="h-3 w-full animate-pulse rounded-sm bg-surface-2" />
              <span className="h-3 w-5/6 animate-pulse rounded-sm bg-surface-2" />
            </div>
          ) : (
            <>
              {detail.description ? (
                <Section title={t("description")} body={detail.description} />
              ) : null}
              {detail.requirements ? (
                <Section title={t("requirements")} body={detail.requirements} />
              ) : null}

              {detail.skills.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-sm font-semibold text-text">{t("skills")}</h3>
                  <ul className="flex flex-wrap gap-1.5">
                    {detail.skills.map((skill) => (
                      <li
                        key={skill}
                        className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-text-muted"
                      >
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>

        <footer className="sticky bottom-0 mt-auto flex shrink-0 flex-wrap gap-2 border-t border-border bg-surface p-4">
          <Button asChild size="sm">
            <Link href={`/karriera/${job.id}`}>
              <ExternalLink />
              {t("apply")}
            </Link>
          </Button>
          <Button size="sm" variant="secondary" onClick={save} loading={saving}>
            <Bookmark />
            {t("save")}
          </Button>
          <Button size="sm" variant="ghost" onClick={share}>
            <Share2 />
            {t("share")}
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={`/karriera/${job.id}#raporto`}>
              <Flag />
              {t("report")}
            </Link>
          </Button>
        </footer>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="truncate text-sm text-text">{value}</dd>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      <p className="measure whitespace-pre-wrap text-sm leading-relaxed text-text-muted">{body}</p>
    </div>
  );
}
