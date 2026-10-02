"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MATERIAL_TYPES } from "@/lib/types";

/** Filtrat rrinë te URL-ja, që një lidhje e ndarë të hapë të njëjtën listë. */
export function MaterialFiltersBar({ courses }: { courses: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const t = useTranslations("material");
  const tm = useTranslations("materialType");
  const tc = useTranslations("common");

  const [query, setQuery] = React.useState(params.get("q") ?? "");

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  }

  React.useEffect(() => {
    const timer = setTimeout(() => update("q", query.trim()), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="flex flex-wrap gap-2">
      <Input
        icon={<Search />}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("title")}
        aria-label={tc("search")}
        className="min-w-48 flex-1"
      />

      <Select
        value={params.get("lenda") ?? "all"}
        onValueChange={(value) => update("lenda", value === "all" ? "" : value)}
      >
        <SelectTrigger className="w-44" aria-label={t("myCourses")}>
          <SelectValue placeholder={t("myCourses")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("myCourses")}</SelectItem>
          {courses.map((course) => (
            <SelectItem key={course.id} value={course.id}>
              {course.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={params.get("lloji") ?? "all"}
        onValueChange={(value) => update("lloji", value === "all" ? "" : value)}
      >
        <SelectTrigger className="w-40" aria-label={t("type")}>
          <SelectValue placeholder={t("type")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("type")}</SelectItem>
          {MATERIAL_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {tm(type)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
