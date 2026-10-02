"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Award,
  BadgeCheck,
  CalendarCheck,
  Compass,
  Crown,
  Flag,
  Flame,
  HandHeart,
  Heart,
  Languages,
  Library,
  LifeBuoy,
  Moon,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import { TooltipContent, TooltipProvider, TooltipRoot, TooltipTrigger } from "@/components/ui/tooltip";

export type ProfileBadge = { key: string; label: string; description: string | null; icon: string };

/** Ikonat e katalogut të badge-ve. Badge-t e garës kanë emoji, që dalin si tekst. */
const ICONS: Record<string, LucideIcon> = {
  "badge-check": BadgeCheck,
  flag: Flag,
  compass: Compass,
  upload: Upload,
  library: Library,
  award: Award,
  "life-buoy": LifeBuoy,
  crown: Crown,
  users: Users,
  moon: Moon,
  flame: Flame,
  "hand-heart": HandHeart,
  "calendar-check": CalendarCheck,
  heart: Heart,
  languages: Languages,
};

/** Sa badge dalin në kokë; të tjerat numërohen. */
const SHOWN = 8;

/**
 * Badge-t në kokën e profilit.
 *
 * Dalin si ikona të vogla, pa seksion më vete. Kur kalon miun sipër, ose i prek
 * në telefon, del çfarë është badge-i dhe si fitohet.
 */
export function ProfileBadges({ badges }: { badges: ProfileBadge[] }) {
  const t = useTranslations("profile");
  const [open, setOpen] = React.useState<string | null>(null);
  if (badges.length === 0) return null;

  const shown = badges.slice(0, SHOWN);
  const rest = badges.length - shown.length;

  return (
    <TooltipProvider delayDuration={120}>
      <ul className="flex flex-wrap items-center gap-1.5" aria-label={t("badges")} data-profile-badges>
        {shown.map((badge) => {
          const Icon = ICONS[badge.icon];
          return (
            <li key={badge.key}>
              <TooltipRoot open={open === badge.key} onOpenChange={(next) => setOpen(next ? badge.key : null)}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    // Prekja në telefon e hap dhe e mbyll; te kompjuteri e hap edhe kalimi i miut.
                    onClick={() => setOpen((current) => (current === badge.key ? null : badge.key))}
                    aria-label={badge.label}
                    data-badge={badge.key}
                    className="grid size-8 place-items-center rounded-full border border-brand-500/30 bg-brand-50 text-brand-500 transition-transform duration-150 hover:scale-110 focus-visible:outline-2 focus-visible:outline-brand-500"
                  >
                    {Icon ? <Icon className="size-4" aria-hidden /> : <span className="text-sm leading-none">{badge.icon}</span>}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-60 rounded-control px-3 py-2.5" data-badge-detail>
                  <p className="text-sm font-bold text-text">{badge.label}</p>
                  {badge.description ? <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{badge.description}</p> : null}
                </TooltipContent>
              </TooltipRoot>
            </li>
          );
        })}
        {rest > 0 ? (
          <li className="grid h-8 min-w-8 place-items-center rounded-full border border-border bg-surface-2 px-2 text-xs font-semibold text-text-muted">
            +{rest}
          </li>
        ) : null}
      </ul>
    </TooltipProvider>
  );
}
