"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import type { FeedTab } from "@/lib/queries/feed";
import { cn } from "@/lib/utils";

/**
 * Filtrat e feed-it, si pilula me ngjyrën e vet.
 *
 * Secili filtër ka një theks: limoni për ata që ndjek, gurkali për fakultetin,
 * qelibari për universitetin, vjollca për Kosovën. Shpjegimi i filtrit rri te
 * `title`, jo si rresht nën pilula.
 */
const TABS: { tab: FeedTab; label: string; hint: string; pro?: boolean }[] = [
  {
    tab: "ndjek",
    label: "tabFollowing",
    hint: "hintFollowing",
  },
  {
    tab: "fakulteti",
    label: "tabFaculty",
    hint: "hintFaculty",
  },
  {
    tab: "universiteti",
    label: "tabUniversity",
    hint: "hintUniversity",
  },
  {
    tab: "global",
    label: "tabGlobal",
    hint: "hintGlobal",
    pro: false,
  },
];

export function FeedTabs({ active, isPro }: { active: FeedTab; isPro: boolean }) {
  const t = useTranslations("feed");

  return (
    <nav
      aria-label={t("tabsLabel")}
      className="-mx-4 flex items-center gap-2 overflow-x-auto scrollbar-none px-4 py-1 sm:mx-0 sm:px-0"
    >
      {TABS.map((item) => {
        const isActive = item.tab === active;
        const locked = Boolean(item.pro) && !isPro;

        return (
          <Link
            key={item.tab}
            href={`/feed?tab=${item.tab}`}
            aria-current={isActive ? "page" : undefined}
            title={t(item.hint)}
            data-tab={item.tab}
            className={cn(
              "feed-tab group relative inline-flex h-10 shrink-0 items-center gap-2 rounded-control px-4 text-[13px] font-semibold sm:text-[14.5px]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
            )}
          >
            {t(item.label)}
            {locked ? <Lock className="size-3 shrink-0 text-text-muted/80" aria-hidden /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
