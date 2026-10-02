"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES } from "@/i18n/config";
import { setLocale } from "@/lib/actions/locale";
import { cn } from "@/lib/utils";

/** Ikona e globit në shiritin e sipërm dhe i njëjti kontroll te cilësimet. */
export function LocaleSwitcher({
  className,
  variant = "icon",
}: {
  className?: string;
  variant?: "icon" | "labelled";
}) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("locale");
  const [pending, startTransition] = React.useTransition();

  function choose(next: string) {
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("switch")}
          disabled={pending}
          className={cn(
            "inline-flex items-center gap-2 rounded-full text-text-muted",
            "transition-colors duration-150 ease-brand hover:bg-surface hover:text-text",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
            variant === "icon" ? "size-10 justify-center" : "h-10 border border-border px-3",
            className,
          )}
        >
          <Globe className="size-4 shrink-0" />
          {variant === "labelled" ? (
            <span className="text-sm">{t(locale === "en" ? "en" : "sq")}</span>
          ) : (
            <span className="sr-only">{t("label")}</span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={locale} onValueChange={choose}>
          {LOCALES.map((item) => (
            <DropdownMenuRadioItem key={item} value={item}>
              {t(item)}
              <span className="tabular ml-auto text-xs text-text-muted">
                {t(item === "en" ? "enShort" : "sqShort")}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
