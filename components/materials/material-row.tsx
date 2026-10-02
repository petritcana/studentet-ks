"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { FileText, Lock, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export type MaterialRowDto = {
  id: string;
  title: string;
  type: string;
  rating: number;
  downloads: number;
  verificationStatus: string;
  courseName: string;
  facultyLabel: string | null;
  locked: boolean;
};

export function MaterialRow({ material }: { material: MaterialRowDto }) {
  const locale = useLocale();
  const tm = useTranslations("materialType");
  const tp = useTranslations("pro");
  const tmat = useTranslations("material");

  return (
    <Link
      href={`/materialet/${material.id}`}
      data-locked={material.locked ? "true" : undefined}
      className={cn(
        "flex items-start gap-3 rounded-md border border-border bg-surface p-3",
        "transition-all duration-150 ease-brand hover:border-brand-500/40 hover:shadow-soft",
      )}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-sm",
          material.locked ? "bg-surface-2 text-text-muted" : "bg-brand-500/10 text-brand-500",
        )}
      >
        {material.locked ? <Lock className="size-4" /> : <FileText className="size-4" />}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-medium text-text">{material.title}</span>
        <span className="tabular flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
          <span>{tm(material.type)}</span>
          <span>· {material.courseName}</span>
          {material.rating > 0 ? (
            <span className="inline-flex items-center gap-1 text-warning-text">
              <Star className="size-3 fill-current" />
              {material.rating.toFixed(1)}
            </span>
          ) : (
            <span>· {tmat("noRating")}</span>
          )}
          <span>
            · {tmat("downloads", { count: formatNumber(material.downloads, locale) })}
          </span>
        </span>
      </span>

      {material.locked ? (
        <Badge variant="neutral" className="shrink-0">
          {tp("withPro")}
        </Badge>
      ) : material.verificationStatus === "verified" ? (
        <Badge variant="success" className="shrink-0">
          {tmat("nowVerified")}
        </Badge>
      ) : null}
    </Link>
  );
}
