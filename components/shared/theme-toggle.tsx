"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { switchTheme } from "@/lib/theme-switch";

/** «Sistemi» është blu e platformës; «E errët» e zezë; «E çelët» e bardhë. */
export const THEME_OPTIONS = [
  { value: "blue", key: "system", Icon: Monitor },
  { value: "dark", key: "dark", Icon: Moon },
  { value: "light", key: "light", Icon: Sun },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("theme");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);


  return (
    <div
      role="radiogroup"
      aria-label={t("label")}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-control border border-border bg-surface-2 p-[3px]",
        className,
      )}
    >
      {THEME_OPTIONS.map(({ value, key, Icon }) => {
        const active = mounted && resolvedTheme === value;
        const label = t(key);

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => switchTheme(setTheme, value)}
            data-color-mode={value}
            className={cn(
              "inline-flex h-[34px] w-9 items-center justify-center rounded-[11px]",
              "transition-colors duration-150 ease-brand",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
              active ? "bg-primary-soft text-brand-500" : "text-text-muted hover:text-text",
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
