"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";

export function JobFilters({
  types,
  cities,
  fields,
}: {
  types: { value: string; label: string }[];
  cities: string[];
  fields: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null || next.get(key) === value) next.delete(key);
    else next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const hasFilters = ["lloji", "qyteti", "fusha", "remote"].some((key) => params.get(key));

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Lloji</p>
        <ChipGroup>
          {types.map((type) => (
            <Chip
              key={type.value}
              selected={params.get("lloji") === type.value}
              onClick={() => update("lloji", type.value)}
            >
              {type.label}
            </Chip>
          ))}
        </ChipGroup>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Fusha</p>
        <ChipGroup>
          {fields.map((field) => (
            <Chip
              key={field}
              selected={params.get("fusha") === field}
              onClick={() => update("fusha", field)}
            >
              {field}
            </Chip>
          ))}
        </ChipGroup>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Qyteti</p>
        <ChipGroup>
          {cities.map((city) => (
            <Chip
              key={city}
              selected={params.get("qyteti") === city}
              onClick={() => update("qyteti", city)}
            >
              {city}
            </Chip>
          ))}
          <Chip
            selected={params.get("remote") === "po"}
            onClick={() => update("remote", "po")}
          >
            Në distancë
          </Chip>
        </ChipGroup>
      </div>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => router.replace(pathname, { scroll: false })}
        >
          <X />
          Pastro filtrat
        </Button>
      ) : null}
    </div>
  );
}
