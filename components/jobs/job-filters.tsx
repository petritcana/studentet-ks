"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Briefcase, Globe, MapPin, Shapes, X } from "lucide-react";
import { UrlFilterSelect } from "@/components/shared/url-filter-select";
import { KOSOVO_MUNICIPALITIES } from "@/lib/kosovo-places";
import { JOB_TYPES } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Parametrat e filtrave te adresa. */
const FILTER_PARAMS = ["lloji", "fusha", "qyteti", "larg"] as const;

/**
 * Filtrat e punëve: tri lista rënëse dhe një çelës.
 *
 * Dikur ishin tre rreshta me çipa, dhe qytetet dilnin vetëm ato që kishin punë.
 * Tani lloji, fusha dhe qyteti janë lista kompakte, qytetet janë të 38 komunat e
 * Kosovës plus çdo vend tjetër që kanë punët (p.sh. «Jashtë vendit»), dhe
 * zgjedhja rri te adresa, që të mbijetojë rifreskimin dhe të dërgohet si lidhje.
 */
export function JobFilters({
  fields,
  cities,
}: {
  fields: string[];
  cities: string[];
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const t = useTranslations("career");
  const tt = useTranslations("jobType");
  const tj = useTranslations("jobs");

  const remote = params.get("larg") === "po";
  const anyActive = FILTER_PARAMS.some((key) => params.has(key));

  // Komunat sipas alfabetit, pastaj vendet e tjera që kanë punë (jashtë vendit etj.).
  const extraPlaces = cities.filter((city) => !KOSOVO_MUNICIPALITIES.includes(city)).sort((a, b) => a.localeCompare(b, "sq"));
  const cityOptions = [...KOSOVO_MUNICIPALITIES, ...extraPlaces].map((city) => ({ value: city, label: city }));

  function without(keys: readonly string[]) {
    const next = new URLSearchParams(params.toString());
    for (const key of keys) next.delete(key);
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function toggleRemote() {
    const next = new URLSearchParams(params.toString());
    if (remote) next.delete("larg");
    else next.set("larg", "po");
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <div className="flex flex-wrap items-center gap-2" data-job-filters>
      <UrlFilterSelect
        param="lloji"
        label={t("filterType")}
        allLabel={t("allTypes")}
        icon={<Briefcase />}
        options={JOB_TYPES.filter((type) => type !== "scholarship").map((type) => ({ value: type, label: tt(type) }))}
      />

      {fields.length > 0 ? (
        <UrlFilterSelect
          param="fusha"
          label={t("filterField")}
          allLabel={t("allFields")}
          icon={<Shapes />}
          options={[...fields].sort((a, b) => a.localeCompare(b, "sq")).map((field) => ({ value: field, label: field }))}
        />
      ) : null}

      <UrlFilterSelect param="qyteti" label={t("filterCity")} allLabel={t("allCities")} icon={<MapPin />} options={cityOptions} />

      <Link
        href={toggleRemote()}
        scroll={false}
        aria-pressed={remote}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors duration-150",
          remote
            ? "border-brand-500/60 bg-brand-50 text-text"
            : "border-border bg-surface-2 text-text-muted hover:border-border-strong hover:text-text",
        )}
      >
        <Globe className="size-4" aria-hidden />
        {t("remote")}
      </Link>

      {anyActive ? (
        <Link
          href={without(FILTER_PARAMS)}
          scroll={false}
          className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-text-muted transition-colors hover:text-text"
        >
          <X className="size-4" aria-hidden />
          {tj("clearFilters")}
        </Link>
      ) : null}
    </div>
  );
}
