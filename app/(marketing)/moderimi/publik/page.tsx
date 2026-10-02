import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatDate, formatNumber } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("transparency");
  return { title: t("title"), description: t("intro") };
}

export const dynamic = "force-dynamic";

// Vetëm shifra të agreguara. Asnjë emër, asnjë lidhje me përmbajtjen.
export default async function PublicModerationPage() {
  const [locale, t, brand] = await Promise.all([
    getLocale(),
    getTranslations("transparency"),
    getTranslations("meta"),
  ]);

  const [weeks, total, actioned, pending] = await Promise.all([
    db.moderationLog.findMany({ orderBy: { weekOf: "desc" }, take: 12 }),
    db.report.count(),
    db.report.count({ where: { status: "actioned" } }),
    db.report.count({ where: { status: { in: ["open", "reviewing"] } } }),
  ]);

  const removedRules = ["ruleHarassment", "ruleHate", "ruleNames", "ruleSexual", "ruleData", "ruleCopyright"];

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <BrandLogo href="/" label={brand("name")} ariaLabel={brand("name")} />
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="permbajtja" className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-muted">
            <ShieldCheck className="size-3.5 text-brand-500" />
            {t("badge")}
          </span>
          <h1 className="font-serif text-2xl text-text">{t("title")}</h1>
          <p className="measure text-sm text-text-muted">{t("intro")}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { value: total, label: t("total") },
            { value: actioned, label: t("actioned") },
            { value: pending, label: t("pending") },
          ].map((item) => (
            <Card key={item.label} className="flex flex-col gap-1 p-4">
              <span className="tabular text-2xl font-semibold text-text">{formatNumber(item.value, locale)}</span>
              <span className="text-sm text-text-muted">{item.label}</span>
            </Card>
          ))}
        </div>

        <Card className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <th scope="col" className="px-4 py-2.5 font-medium">{t("week")}</th>
                <th scope="col" className="px-4 py-2.5 font-medium">{t("removed")}</th>
                <th scope="col" className="px-4 py-2.5 font-medium">{t("reviewed")}</th>
                <th scope="col" className="px-4 py-2.5 font-medium">{t("dismissed")}</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-text">{formatDate(week.weekOf, locale)}</td>
                  <td className="tabular px-4 py-2.5 text-text">{week.removed}</td>
                  <td className="tabular px-4 py-2.5 text-text-muted">{week.reviewed}</td>
                  <td className="tabular px-4 py-2.5 text-text-muted">{week.dismissed}</td>
                </tr>
              ))}
              {weeks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-text-muted">
                    {t("noWeeks")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>

        <div className="flex flex-col gap-3">
          <h2 className="font-serif text-xl text-text">{t("whatGoes")}</h2>
          <ul className="measure flex list-disc flex-col gap-1.5 pl-5 text-sm text-text-muted">
            {removedRules.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
          <p className="measure text-sm text-text-muted">{t("autoHide")}</p>
        </div>

        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
          <Link href="/ligjore/privatesia" className="text-brand-500 hover:underline">
            {t("privacyLink")}
          </Link>
          <Link href="/ligjore/kushtet" className="text-brand-500 hover:underline">
            {t("termsLink")}
          </Link>
        </p>
      </main>
    </div>
  );
}
