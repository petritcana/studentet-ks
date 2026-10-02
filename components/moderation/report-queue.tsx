"use client";

import { TimeAgo } from "@/components/shared/time-ago";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, EyeOff, Hand, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/shared/empty-state";
import { claimReport, resolveReport } from "@/lib/actions/moderation";

export type ReportItem = {
  id: string;
  reason: string;
  note: string | null;
  status: string;
  createdAt: string;
  count: number;
  targetType: string;
  targetId: string;
  href: string | null;
  excerpt: string | null;
  isHidden: boolean;
};

/**
 * Radha e moderimit.
 *
 * Përmbajtja shfaqet e plotë, sepse një vendim pa kontekst është hamendje. Nota
 * e vendimit ruhet gjithmonë: anulimi pa arsye të regjistruar nuk ekziston.
 */
export function ReportQueue({ reports }: { reports: ReportItem[] }) {
  const router = useRouter();
  const t = useTranslations("moderation");
  const tr = useTranslations("reportReason");
  const tc = useTranslations("common");

  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [pending, startTransition] = React.useTransition();

  function decide(id: string, decision: "remove" | "restore" | "dismiss") {
    startTransition(async () => {
      const result = await resolveReport(id, decision, notes[id]);
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      toast.success(tc("saved"));
      router.refresh();
    });
  }

  function claim(id: string) {
    startTransition(async () => {
      await claimReport(id);
      router.refresh();
    });
  }

  if (reports.length === 0) {
    return <EmptyState illustration="bell" title={t("queueEmpty")} />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {reports.map((report) => (
        <li key={report.id}>
          <Card className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="danger">{tr(report.reason)}</Badge>
              <Badge variant="neutral">{report.targetType}</Badge>
              {report.count > 1 ? (
                <Badge variant="warning">{report.count}</Badge>
              ) : null}
              {report.isHidden ? <Badge variant="neutral">{t("hidden")}</Badge> : null}
              <span className="tabular ml-auto text-xs text-text-muted">
                <TimeAgo value={report.createdAt} />
              </span>
            </div>

            {report.excerpt ? (
              <p className="measure rounded-md bg-surface-2 p-3 text-sm text-text">
                {report.excerpt}
              </p>
            ) : (
              <p className="text-sm text-text-muted">{t("notFound")}</p>
            )}

            {report.note ? (
              <p className="text-xs text-text-muted">{t("reporterNote", { note: report.note })}</p>
            ) : null}

            {report.href ? (
              <Link href={report.href} className="w-fit text-xs text-brand-500 hover:underline">
                {tc("open")}
              </Link>
            ) : null}

            <Input
              value={notes[report.id] ?? ""}
              maxLength={200}
              placeholder={t("note")}
              aria-label={t("note")}
              onChange={(event) =>
                setNotes((current) => ({ ...current, [report.id]: event.target.value }))
              }
            />

            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {report.status === "open" ? (
                <Button size="sm" variant="secondary" onClick={() => claim(report.id)}>
                  <Hand />
                  {t("claim")}
                </Button>
              ) : null}

              <Button
                size="sm"
                variant="danger"
                loading={pending}
                onClick={() => decide(report.id, "remove")}
              >
                <EyeOff />
                {t("remove")}
              </Button>

              {report.isHidden ? (
                <Button size="sm" variant="outline" onClick={() => decide(report.id, "restore")}>
                  <RotateCcw />
                  {t("restore")}
                </Button>
              ) : null}

              <Button size="sm" variant="ghost" onClick={() => decide(report.id, "dismiss")}>
                <Check />
                {t("dismiss")}
              </Button>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
