import { BookOpen, GraduationCap, Heart, MapPin, School, Users } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Rreshti i vogël i arsyes. Shfaqet kudo ku duket një person, sepse ai rresht,
 * jo fotoja, është ajo që e bind dikë ta pranojë ndjekjen.
 */
function iconFor(reason: string) {
  if (reason.includes("lëndë")) return BookOpen;
  if (reason.includes("shok")) return Users;
  if (reason.includes("viti")) return GraduationCap;
  if (reason.includes("shkoll")) return School;
  if (reason.includes("Interesa")) return Heart;
  return MapPin;
}

export function MutualContext({
  reasons,
  max = 2,
  className,
}: {
  reasons: string[];
  max?: number;
  className?: string;
}) {
  if (reasons.length === 0) return null;
  const shown = reasons.slice(0, max);

  return (
    <span className={cn("flex flex-wrap items-center gap-x-2 gap-y-0.5", className)}>
      {shown.map((reason, index) => {
        const Icon = iconFor(reason);
        return (
          <span key={reason} className="inline-flex items-center gap-1 text-xs text-text-muted">
            {index === 0 ? <Icon className="size-3 shrink-0" aria-hidden /> : null}
            <span className="truncate">{reason}</span>
            {index < shown.length - 1 ? <span aria-hidden>·</span> : null}
          </span>
        );
      })}
    </span>
  );
}
