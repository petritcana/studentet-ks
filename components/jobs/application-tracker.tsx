"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Building2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/shared/empty-state";
import { removeApplication, setApplicationState } from "@/lib/actions/career";
import { APPLICATION_STATES, type ApplicationState } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ApplicationRow = {
  jobId: string;
  title: string;
  company: string;
  city: string;
  status: ApplicationState;
  deadline: string;
};

/** Ngjyra e secilës gjendje. E gjelbra vetëm për pranimin, e kuqja vetëm për refuzimin. */
const TONES: Record<ApplicationState, string> = {
  saved: "neutral",
  applied: "brand",
  interview: "warning",
  rejected: "danger",
  accepted: "success",
  archived: "neutral",
};

/**
 * Gjurmuesi i aplikimeve.
 *
 * Kolona për gjendje, sepse studenti e mban vetë: kompanitë nuk na e thonë kur
 * dikush kalon në intervistë. Kalimi mes gjendjeve është një klikim.
 */
export function ApplicationTracker({ rows }: { rows: ApplicationRow[] }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("career");
  const tc = useTranslations("common");
  const [, startTransition] = React.useTransition();

  function move(jobId: string, status: ApplicationState) {
    startTransition(async () => {
      const result = await setApplicationState(jobId, status);
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      router.refresh();
    });
  }

  function drop(jobId: string) {
    startTransition(async () => {
      await removeApplication(jobId);
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return <EmptyState illustration="search" title={t("trackerEmpty")} />;
  }

  // Grupimi sipas gjendjes, në rendin e përcaktuar te konstantet.
  const byState = APPLICATION_STATES.map((state) => ({
    state,
    items: rows.filter((row) => row.status === state),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-5">
      {byState.map((group) => (
        <section key={group.state} className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <Badge variant={TONES[group.state] as never}>{t(`state_${group.state}`)}</Badge>
            <span className="tabular text-xs font-normal text-text-muted">
              {group.items.length}
            </span>
          </h2>

          <ul className="flex flex-col gap-2">
            {group.items.map((row) => (
              <li key={row.jobId}>
                <Card className="flex flex-wrap items-center gap-3 p-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-2 text-text-muted">
                    <Building2 className="size-4" />
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col">
                    <Link
                      href={`/karriera/${row.jobId}`}
                      className="truncate text-sm font-medium text-text hover:text-brand-500"
                    >
                      {row.title}
                    </Link>
                    <span className="tabular truncate text-xs text-text-muted">
                      {row.company} · {row.city} · {formatDate(row.deadline, locale)}
                    </span>
                  </span>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        {t("moveTo")}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t("moveTo")}</DropdownMenuLabel>
                      {APPLICATION_STATES.filter((state) => state !== row.status).map((state) => (
                        <DropdownMenuItem key={state} onSelect={() => move(row.jobId, state)}>
                          {t(`state_${state}`)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    size="iconSm"
                    variant="ghost"
                    aria-label={tc("delete")}
                    onClick={() => drop(row.jobId)}
                    className={cn("shrink-0")}
                  >
                    <X />
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
