"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "per-ty", label: "forYou", hint: "forYou" },
  { key: "gjenerata", label: "generation", hint: "generation" },
  { key: "ndjek", label: "following", hint: "following" },
] as const;

export function FeedTabs({ active }: { active: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const t = useTranslations("feed");
  const current = TABS.find((tab) => tab.key === active) ?? TABS[0];

  return (
    <div className="flex flex-col gap-2">
      <div
        role="tablist"
        aria-label="Rrjedhat e feed-it"
        className="flex items-center gap-1 overflow-x-auto rounded-full border border-border bg-bg p-1 scrollbar-thin"
      >
        {TABS.map((tab) => {
          const next = new URLSearchParams(params.toString());
          next.set("tab", tab.key);
          const isActive = tab.key === active;

          return (
            <Link
              key={tab.key}
              href={`${pathname}?${next.toString()}`}
              role="tab"
              aria-selected={isActive}
              scroll={false}
              className={cn(
                "inline-flex h-9 shrink-0 items-center rounded-full px-4 text-sm font-medium",
                "transition-colors duration-150 ease-brand",
                isActive
                  ? "bg-surface text-text shadow-soft"
                  : "text-text-muted hover:text-text",
              )}
            >
              {t(`tabs.${tab.label}`)}
            </Link>
          );
        })}
      </div>
      <p className="px-1 text-xs text-text-muted">{t(`hints.${current.hint}`)}</p>
    </div>
  );
}
