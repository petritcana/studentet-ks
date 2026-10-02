"use client";

import { useLocale, useTranslations } from "next-intl";
import { Award, ExternalLink, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deadlineDays, formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ScholarshipDto = {
  id: string;
  title: string;
  provider: string;
  description: string;
  amountCents: number | null;
  country: string;
  field: string;
  level: string;
  eligibility: string;
  link: string | null;
  deadline: string;
};

/**
 * Karta e bursës.
 *
 * E ndarë nga puna sepse fushat janë të tjera: kush e jep, sa është, kush mund
 * të aplikojë. Një bursë e paraqitur si punë do t'i fshihte pikërisht ato.
 */
export function ScholarshipCard({ scholarship }: { scholarship: ScholarshipDto }) {
  const locale = useLocale();
  const t = useTranslations("career");
  const days = deadlineDays(scholarship.deadline);

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-accent-500/12 text-accent-text">
          <Award className="size-5" />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-pretty text-sm font-semibold text-text">{scholarship.title}</p>
          <p className="tabular flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
            <span>{scholarship.provider}</span>
            <span className="inline-flex items-center gap-1">
              · <Globe className="size-3" />
              {scholarship.country}
            </span>
            <span>· {scholarship.field}</span>
          </p>
        </div>
      </div>

      <p className="measure line-clamp-2 text-sm text-text-muted">{scholarship.description}</p>

      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {scholarship.amountCents ? (
          <div className="flex gap-1.5">
            <dt className="text-text-muted">{t("scholarshipAmount")}</dt>
            <dd className="tabular font-medium text-text">
              {formatMoney(scholarship.amountCents, "EUR", locale)}
            </dd>
          </div>
        ) : null}
        <div className="flex gap-1.5">
          <dt className="text-text-muted">{t("scholarshipLevel")}</dt>
          <dd className="font-medium text-text">{scholarship.level}</dd>
        </div>
      </dl>

      <p className="measure text-xs text-text-muted">
        <span className="font-medium text-text">{t("scholarshipEligibility")}: </span>
        {scholarship.eligibility}
      </p>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Badge variant={days <= 7 ? "warning" : "neutral"}>
          {days < 0
            ? t("closed")
            : days === 0
              ? t("closesToday")
              : days <= 14
                ? t("daysLeft", { count: days })
                : formatDate(scholarship.deadline, locale)}
        </Badge>

        {scholarship.link && days >= 0 ? (
          <Button asChild size="sm" className={cn("ml-auto")}>
            <a href={scholarship.link} target="_blank" rel="noopener noreferrer">
              {t("apply")}
              <ExternalLink />
            </a>
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
