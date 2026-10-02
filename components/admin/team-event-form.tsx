"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { createTeamEventAction } from "@/lib/actions/competition";
import { COMPETITION_CATEGORIES, type CompetitionCategory } from "@/lib/competition/categories";

const SELECT =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text transition-colors duration-150 focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30";

/** Hapja e një gare mes dy universiteteve. */
export function TeamEventForm({ universities }: { universities: { id: string; abbr: string; name: string }[] }) {
  const router = useRouter();
  const t = useTranslations("competition");
  const tc = useTranslations("common");
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<CompetitionCategory>("general");
  const [a, setA] = React.useState(universities[0]?.id ?? "");
  const [b, setB] = React.useState(universities[1]?.id ?? "");
  const [hours, setHours] = React.useState("24");
  const [pending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createTeamEventAction({
        title,
        category,
        universityAId: a,
        universityBId: b,
        hours: Number(hours),
      });
      if (!result.ok) {
        const key = result.messageKey ?? "";
        toast.error(key.startsWith("competition.") ? t(key.replace("competition.", "")) : tc("retry"));
        return;
      }
      toast.success(t("eventCreated"));
      setTitle("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="event-title">{t("adminEventTitle")}</Label>
        <Input id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={90} placeholder={t("adminEventTitlePlaceholder")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="event-category">{t("adminCategory")}</Label>
        <select id="event-category" className={SELECT} value={category} onChange={(e) => setCategory(e.target.value as CompetitionCategory)}>
          {COMPETITION_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {t(`cat_${value}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="event-hours">{t("adminHours")}</Label>
        <Input id="event-hours" type="number" min={1} max={168} value={hours} onChange={(e) => setHours(e.target.value)} />
      </div>
      {(
        [
          ["event-a", t("adminUniversityA"), a, setA],
          ["event-b", t("adminUniversityB"), b, setB],
        ] as const
      ).map(([id, label, value, set]) => (
        <div key={id} className="flex flex-col gap-1.5">
          <Label htmlFor={id}>{label}</Label>
          <select id={id} className={SELECT} value={value} onChange={(e) => set(e.target.value)}>
            {universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.abbr} · {university.name}
              </option>
            ))}
          </select>
        </div>
      ))}
      <Button type="submit" loading={pending} className="self-start sm:col-span-2 sm:justify-self-start">
        {t("adminCreate")}
      </Button>
    </form>
  );
}
