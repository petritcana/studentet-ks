"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchPlaces } from "@/lib/kosovo-places";
import { cn } from "@/lib/utils";

/**
 * Qyteti, me kërkim mbi tërë Kosovën.
 *
 * Lista e plotë nuk shfaqet si dropdown gjigant: studenti shkruan dy shkronja
 * dhe zgjedh. Vendbanimet e vogla janë aty me qëllim, sepse aty lind lidhja
 * «edhe unë jam nga aty», e cila nuk ndodh me shtatë qytete të mëdha.
 */
export function CityPicker({
  id,
  label,
  value,
  onChange,
  help,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
}) {
  const t = useTranslations("academic");
  const [query, setQuery] = React.useState(value);
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);

  const results = React.useMemo(() => (open ? searchPlaces(query) : []), [open, query]);

  React.useEffect(() => setQuery(value), [value]);

  function choose(name: string) {
    onChange(name);
    setQuery(name);
    setOpen(false);
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>

      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden />
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          placeholder={t("citySearch")}
          className="pl-9"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(event) => {
            if (!open) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlight((index) => Math.min(index + 1, results.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && results[highlight]) {
              event.preventDefault();
              choose(results[highlight].name);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>

      {help ? <p className="text-xs text-text-muted">{help}</p> : null}

      {open && results.length > 0 ? (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute top-full z-20 mt-1 flex max-h-60 w-full flex-col overflow-y-auto rounded-lg border border-border bg-surface-solid p-1 shadow-lifted scrollbar-thin"
        >
          {results.map((place, index) => (
            <li key={`${place.name}-${place.municipality}`}>
              <button
                type="button"
                role="option"
                aria-selected={index === highlight}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(place.name)}
                onMouseEnter={() => setHighlight(index)}
                className={cn(
                  "flex w-full items-baseline justify-between gap-3 rounded-md px-2.5 py-1.5 text-left text-sm",
                  index === highlight ? "bg-surface-2 text-text" : "text-text-muted",
                )}
              >
                <span className="truncate text-text">{place.name}</span>
                {place.municipality !== place.name ? (
                  <span className="shrink-0 text-xs text-text-muted">{place.municipality}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
