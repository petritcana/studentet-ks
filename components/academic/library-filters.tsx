"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { facultyTheme } from "@/lib/faculties";
import { cn } from "@/lib/utils";

export function LibraryFilters({
  faculties,
  types,
}: {
  faculties: { id: string; label: string; color: string }[];
  types: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = React.useState(params.get("q") ?? "");

  const activeFaculty = params.get("fakulteti");
  const activeType = params.get("lloj");
  const hasFilters = Boolean(activeFaculty || activeType || params.get("q") || params.get("vit"));

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null || next.get(key) === value) next.delete(key);
    else next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    update("q", query.trim() || null);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <form onSubmit={submitSearch}>
        <Input
          icon={<Search />}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Kërko titullin e materialit ose profesorin"
          aria-label="Kërko materiale"
        />
      </form>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Fakulteti</p>
        <ChipGroup>
          {faculties.map((faculty) => {
            const theme = facultyTheme(faculty.color);
            const active = activeFaculty === faculty.id;
            return (
              <Chip
                key={faculty.id}
                selected={active}
                onClick={() => update("fakulteti", faculty.id)}
                className={cn(active && theme.text)}
              >
                <span className={cn("size-2 rounded-full", theme.dot)} aria-hidden />
                {faculty.label}
              </Chip>
            );
          })}
        </ChipGroup>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Lloji</p>
        <ChipGroup>
          {types.map((type) => (
            <Chip
              key={type.value}
              selected={activeType === type.value}
              onClick={() => update("lloj", type.value)}
            >
              {type.label}
            </Chip>
          ))}
        </ChipGroup>
      </div>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => {
            setQuery("");
            router.replace(pathname, { scroll: false });
          }}
        >
          <X />
          Pastro filtrat
        </Button>
      ) : null}
    </div>
  );
}
