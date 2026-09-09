"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", key: "light", Icon: Sun },
  { value: "system", key: "system", Icon: Monitor },
  { value: "dark", key: "dark", Icon: Moon },
] as const;

/** Tre gjendje, jo dy. Sistemi është zgjedhja e parazgjedhur. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  return (
    <div
      role="radiogroup"
      aria-label={t("label")}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border bg-surface-2 p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ value, key, Icon }) => {
        const active = mounted && theme === value;
        const label = t(key);
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-full",
              "transition-colors duration-150 ease-brand",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
              active
                ? "bg-surface text-brand-500 shadow-soft"
                : "text-text-muted hover:text-text",
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
