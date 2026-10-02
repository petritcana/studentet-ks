"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { saveCareerProfile } from "@/lib/actions/career";
import { cn } from "@/lib/utils";

const VISIBILITIES = ["private", "students", "employers", "public"] as const;

export type CareerProfileValues = {
  visibility: string;
  headline: string;
  summary: string;
  skills: string[];
  languages: string[];
  desiredRoles: string[];
  preferredCity: string;
  portfolioUrl: string;
  openToWork: boolean;
};

export function CareerProfileForm({ initial }: { initial: CareerProfileValues }) {
  const router = useRouter();
  const t = useTranslations("career");
  const tc = useTranslations("common");

  const [values, setValues] = React.useState(initial);
  const [pending, startTransition] = React.useTransition();

  function set<K extends keyof CareerProfileValues>(key: K, value: CareerProfileValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function list(text: string) {
    return text
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await saveCareerProfile(values);
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      toast.success(t("profileSaved"));
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-4 shadow-soft sm:p-6"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-text">{t("visibility")}</legend>
        <div className="flex flex-wrap gap-2">
          {VISIBILITIES.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={values.visibility === item}
              onClick={() => set("visibility", item)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                values.visibility === item
                  ? "border-brand-500 bg-brand-500/12 text-brand-500"
                  : "border-border bg-surface text-text-muted hover:text-text",
              )}
            >
              {t(`visibility_${item}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex items-start gap-3 rounded-md border border-border bg-surface-2/60 p-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Label htmlFor="open-to-work">{t("openToWork")}</Label>
          <p className="text-xs text-text-muted">{t("profileBody")}</p>
        </div>
        <Switch
          id="open-to-work"
          checked={values.openToWork}
          onCheckedChange={(value) => set("openToWork", value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="headline">{t("headline")}</Label>
        <Input
          id="headline"
          maxLength={120}
          value={values.headline}
          onChange={(event) => set("headline", event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="summary">{t("summary")}</Label>
        <Textarea
          id="summary"
          autoGrow
          maxLength={800}
          value={values.summary}
          onChange={(event) => set("summary", event.target.value)}
          className="min-h-24"
        />
      </div>

      {(
        [
          ["skills", t("skills")],
          ["languages", t("languages")],
          ["desiredRoles", t("desiredRoles")],
        ] as const
      ).map(([key, label]) => (
        <div key={key} className="flex flex-col gap-1.5">
          <Label htmlFor={key}>{label}</Label>
          <Input
            id={key}
            value={values[key].join(", ")}
            onChange={(event) => set(key, list(event.target.value))}
          />
          <p className="text-xs text-text-muted">{t("comma")}</p>
        </div>
      ))}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">{t("preferredCity")}</Label>
          <Input
            id="city"
            maxLength={60}
            value={values.preferredCity}
            onChange={(event) => set("preferredCity", event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="portfolio">{t("portfolio")}</Label>
          <Input
            id="portfolio"
            type="url"
            value={values.portfolioUrl}
            onChange={(event) => set("portfolioUrl", event.target.value)}
          />
        </div>
      </div>

      <Button type="submit" loading={pending} className="self-start">
        <Save />
        {t("saveProfile")}
      </Button>
    </form>
  );
}
