"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { Card } from "@/components/ui/card";
import { setLocale } from "@/lib/actions/locale";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "sq", key: "sq" },
  { value: "en", key: "en" },
] as const;

/**
 * Shqipja është parazgjedhja. Anglishtja ekziston për studentët ndërkombëtarë
 * dhe për programet në anglisht, jo si gjuhë kryesore e produktit.
 */
export function LanguagePanel() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("language");
  const [pending, startTransition] = React.useTransition();

  return (
    <Card className="flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Languages className="size-4 text-brand-500" />
        <h2 className="text-sm font-semibold text-text">{t("label")}</h2>
      </div>

      <div
        role="radiogroup"
        aria-label={t("label")}
        className="flex flex-wrap gap-2"
      >
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={locale === option.value}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await setLocale(option.value);
                router.refresh();
              })
            }
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 ease-brand",
              locale === option.value
                ? "border-brand-500 bg-brand-500/12 text-brand-500"
                : "border-border bg-surface text-text-muted hover:text-text",
            )}
          >
            {t(option.key)}
          </button>
        ))}
      </div>
    </Card>
  );
}
