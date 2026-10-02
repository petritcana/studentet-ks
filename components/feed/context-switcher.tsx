"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, Globe, GraduationCap, Landmark, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FeedTab } from "@/lib/queries/feed";
import { cn } from "@/lib/utils";

const SPACES: { tab: FeedTab; key: string; icon: typeof Globe }[] = [
  { tab: "fakulteti", key: "tabFaculty", icon: GraduationCap },
  { tab: "gjenerata", key: "tabGeneration", icon: Users },
  { tab: "universiteti", key: "tabUniversity", icon: Landmark },
  { tab: "global", key: "tabGlobal", icon: Globe },
];

export function ContextSwitcher({ active }: { active: FeedTab }) {
  const router = useRouter();
  const t = useTranslations("feed");

  const current = SPACES.find((space) => space.tab === active) ?? SPACES[0];
  const Icon = current.icon;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-text-muted">{t("currentSpace")}</span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5",
              "text-sm font-medium text-text transition-colors duration-150 ease-brand",
              "hover:border-brand-500/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
            )}
          >
            <Icon className="size-3.5 text-brand-500" aria-hidden />
            {t(current.key)}
            <ChevronDown className="size-3.5 text-text-muted" aria-hidden />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>{t("currentSpace")}</DropdownMenuLabel>
          {SPACES.map((space) => {
            const SpaceIcon = space.icon;
            return (
              <DropdownMenuItem
                key={space.tab}
                onSelect={() => router.push(`/feed?tab=${space.tab}`)}
              >
                <SpaceIcon />
                {t(space.key)}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
