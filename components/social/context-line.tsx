"use client";

import { useTranslations } from "next-intl";
import { BookOpen, GraduationCap, Heart, MapPin, School, Users } from "lucide-react";
import type { ContextReason } from "@/lib/suggestions";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Users> = {
  sharedCourses: BookOpen,
  sharedCourseOne: BookOpen,
  mutualFriends: Users,
  mutualFriendOne: Users,
  sameFacultyYear: GraduationCap,
  sameHighSchool: School,
  sameCity: MapPin,
  sharedInterests: Heart,
};

/**
 * Rreshti i vogël i arsyes, i detyrueshëm kudo ku shfaqet një person.
 * Ai rresht, jo fotoja, është ajo që e rrit pranimin e ndjekjes.
 */
export function ContextLine({
  reasons,
  max = 2,
  className,
}: {
  reasons: ContextReason[];
  max?: number;
  className?: string;
}) {
  const t = useTranslations("context");
  if (reasons.length === 0) return null;

  const shown = reasons.slice(0, max);

  return (
    <span className={cn("flex flex-wrap items-center gap-x-2 gap-y-0.5", className)}>
      {shown.map((reason, index) => {
        const Icon = ICONS[reason.key] ?? MapPin;
        return (
          <span key={reason.key} className="inline-flex items-center gap-1 text-xs text-text-muted">
            {index === 0 ? <Icon className="size-3 shrink-0" aria-hidden /> : null}
            <span className="truncate">{t(reason.key, reason.values ?? {})}</span>
            {index < shown.length - 1 ? <span aria-hidden>·</span> : null}
          </span>
        );
      })}
    </span>
  );
}
