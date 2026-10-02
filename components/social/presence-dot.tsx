import { useTranslations } from "next-intl";
import type { PresenceStatus } from "@/lib/presence";
import { cn } from "@/lib/utils";

const TONE: Record<PresenceStatus, string> = {
  online: "bg-success",
  away: "bg-warning",
  offline: "bg-text-muted/50",
};

export function PresenceDot({
  status,
  className,
}: {
  status: PresenceStatus;
  className?: string;
}) {
  const t = useTranslations("presence");
  const label = t(status);

  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <span className={cn("size-2 rounded-full", TONE[status])} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * Pika e ngjitur mbi avatar.
 *
 * Kur statusi është jashtë linje nuk vizatohet fare: një pikë gri mbi çdo avatar
 * do ta mbushte listën me zhurmë pa thënë asgjë.
 */
export function PresenceBadge({
  status,
  className,
}: {
  status: PresenceStatus;
  className?: string;
}) {
  const t = useTranslations("presence");

  if (status === "offline") return null;

  return (
    <span
      className={cn(
        "absolute -bottom-0.5 -right-0.5 grid place-items-center rounded-full bg-surface-solid p-0.5",
        className,
      )}
    >
      <span className={cn("block size-2 rounded-full", TONE[status])} aria-hidden />
      <span className="sr-only">{t(status)}</span>
    </span>
  );
}
