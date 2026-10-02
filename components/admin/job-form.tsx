"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { publishJob } from "@/lib/actions/admin-jobs";
import { JOB_FIELDS } from "@/lib/job-match";
import { JOB_TYPES, type JobType } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMPTY = {
  companyId: "",
  title: "",
  field: "Teknologji" as (typeof JOB_FIELDS)[number],
  city: "Prishtinë",
  description: "",
  requirements: "",
  salary: "",
  deadline: "",
  link: "",
};

const SELECT =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text transition-colors duration-150 focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30";

/** Formulari i adminit për shpalljet e punës. Publikimi njofton studentët që i përshtaten. */
export function JobForm({ companies }: { companies: { id: string; name: string }[] }) {
  const router = useRouter();
  const t = useTranslations("adminJobs");
  const tt = useTranslations("jobType");
  const tc = useTranslations("common");

  const [type, setType] = React.useState<JobType>("internship");
  const [remote, setRemote] = React.useState(false);
  const [fields, setFields] = React.useState({ ...EMPTY, companyId: companies[0]?.id ?? "" });
  const [pending, startTransition] = React.useTransition();

  function field(name: keyof typeof EMPTY) {
    return {
      id: `job-${name}`,
      value: fields[name],
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setFields((current) => ({ ...current, [name]: event.target.value })),
    };
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await publishJob({
        ...fields,
        type,
        isRemote: remote,
        // Afati mbyllet në fund të ditës së zgjedhur, jo në mesnatën e saj.
        deadline: fields.deadline ? new Date(`${fields.deadline}T23:59:00`).toISOString() : "",
      });
      if (!result.ok) {
        const key = result.messageKey ?? "";
        toast.error(key.startsWith("adminJobs.") ? t(key.replace("adminJobs.", "")) : tc("retry"));
        return;
      }
      toast.success(t("published", { count: result.notified ?? 0 }));
      setFields((current) => ({ ...EMPTY, companyId: current.companyId }));
      router.refresh();
    });
  }

  const pill = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150",
      active ? "border-brand-500 bg-brand-500/10 text-text" : "border-border text-text-muted hover:text-text",
    );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-sm font-medium text-text">{t("type")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {JOB_TYPES.map((value) => (
            <button key={value} type="button" aria-pressed={type === value} onClick={() => setType(value)} className={pill(type === value)}>
              {tt(value)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="job-companyId">{t("company")}</Label>
          <select {...field("companyId")} className={SELECT}>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="job-title">{t("jobTitle")}</Label>
          <Input {...field("title")} maxLength={120} placeholder={t("jobTitlePlaceholder")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="job-field">{t("field")}</Label>
          <select {...field("field")} className={SELECT}>
            {JOB_FIELDS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-muted">{t("fieldHint")}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="job-city">{t("city")}</Label>
          <Input {...field("city")} maxLength={60} />
          <label className="mt-1 flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={remote} onChange={(event) => setRemote(event.target.checked)} className="accent-brand-500" />
            {t("remote")}
          </label>
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="job-description">{t("description")}</Label>
          <Textarea {...field("description")} maxLength={4000} placeholder={t("descriptionPlaceholder")} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="job-requirements">{t("requirements")}</Label>
          <Textarea {...field("requirements")} maxLength={2000} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="job-deadline">{t("deadline")}</Label>
          <Input {...field("deadline")} type="date" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="job-salary">{t("salary")}</Label>
          <Input {...field("salary")} maxLength={80} placeholder={t("salaryPlaceholder")} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="job-link">{t("link")}</Label>
          <Input {...field("link")} maxLength={300} placeholder="https://" />
        </div>
      </div>

      <Button type="submit" loading={pending} className="self-start" disabled={companies.length === 0}>
        {t("publish")}
      </Button>
    </form>
  );
}
