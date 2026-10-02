"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { createAd } from "@/lib/actions/ads";

const EMPTY = {
  advertiser: "",
  title: "",
  titleEn: "",
  body: "",
  bodyEn: "",
  cta: "",
  ctaEn: "",
  url: "",
  days: "30",
  priority: "5",
  budgetEur: "0",
};

/** Formulari i adminit për të futur një reklamë të shitur. */
export function AdForm() {
  const router = useRouter();
  const t = useTranslations("adminAds");
  const tc = useTranslations("common");
  const [fields, setFields] = React.useState(EMPTY);
  const [pending, startTransition] = React.useTransition();

  function field(name: keyof typeof EMPTY) {
    return {
      id: `ad-${name}`,
      value: fields[name],
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setFields((current) => ({ ...current, [name]: event.target.value })),
    };
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createAd({
        ...fields,
        days: Number(fields.days) || 30,
        priority: Number(fields.priority) || 5,
        budgetEur: Number(fields.budgetEur) || 0,
      });
      if (!result.ok) {
        toast.error(result.messageKey === "adminAds.invalid" ? t("invalid") : tc("retry"));
        return;
      }
      toast.success(t("published"));
      setFields(EMPTY);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ad-advertiser">{t("advertiser")}</Label>
          <Input {...field("advertiser")} maxLength={60} placeholder={t("advertiserPlaceholder")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ad-url">{t("url")}</Label>
          <Input {...field("url")} maxLength={300} placeholder="https://" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ad-title">{t("titleSq")}</Label>
          <Input {...field("title")} maxLength={80} placeholder={t("titlePlaceholder")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ad-titleEn">{t("titleEn")}</Label>
          <Input {...field("titleEn")} maxLength={80} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ad-body">{t("bodySq")}</Label>
          <Textarea {...field("body")} maxLength={300} placeholder={t("bodyPlaceholder")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ad-bodyEn">{t("bodyEn")}</Label>
          <Textarea {...field("bodyEn")} maxLength={300} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ad-cta">{t("ctaSq")}</Label>
          <Input {...field("cta")} maxLength={30} placeholder={t("ctaPlaceholder")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ad-ctaEn">{t("ctaEn")}</Label>
          <Input {...field("ctaEn")} maxLength={30} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ad-days">{t("days")}</Label>
          <Input {...field("days")} inputMode="numeric" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ad-budgetEur">{t("budget")}</Label>
          <Input {...field("budgetEur")} inputMode="numeric" />
          <p className="text-xs text-text-muted">{t("budgetHint")}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ad-priority">{t("priority")}</Label>
          <Input {...field("priority")} inputMode="numeric" />
          <p className="text-xs text-text-muted">{t("priorityHint")}</p>
        </div>
      </div>

      <Button type="submit" loading={pending} className="self-start">
        {t("publish")}
      </Button>
    </form>
  );
}
