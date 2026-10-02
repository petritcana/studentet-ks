"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Radix nuk pranon vlerë bosh te një zë, prandaj «të gjitha» ka shenjën e vet. */
const ALL = "__te-gjitha";

/**
 * Filtër si listë rënëse që rri te adresa.
 *
 * Zgjedhja shkruhet te parametri i adresës, që të mbijetojë rifreskimin dhe të
 * dërgohet si lidhje. Parametrat e tjerë mbeten siç janë. Lista përdor
 * komponentin e temës, prandaj në errësirë nuk del e bardhë si <select> vendas.
 */
export function UrlFilterSelect({
  param,
  options,
  allLabel,
  label,
  icon,
  className,
}: {
  param: string;
  options: { value: string; label: string }[];
  allLabel: string;
  label: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get(param) ?? ALL;
  const active = current !== ALL;

  function change(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === ALL) next.delete(param);
    else next.set(param, value);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <Select value={current} onValueChange={change}>
      <SelectTrigger
        aria-label={label}
        data-filter={param}
        className={cn(
          "h-10 w-auto min-w-40 gap-2 rounded-full px-4",
          active && "border-brand-500/60 bg-brand-50 text-text",
          className,
        )}
      >
        {icon ? <span className="shrink-0 text-text-muted [&_svg]:size-4">{icon}</span> : null}
        <span className="flex min-w-0 flex-1 items-center gap-1 truncate text-left">
          {!active ? <span className="sr-only">{label}: </span> : null}
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent className="max-h-80">
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
