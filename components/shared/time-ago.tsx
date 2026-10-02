"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { formatDate, timeAgo } from "@/lib/format";

/**
 * "12 min", "3 orë". Rifreskohet çdo minutë.
 *
 * suppressHydrationWarning është i nevojshëm: serveri dhe shfletuesi e llogarisin
 * në momente të ndryshme dhe mund të bien në dy anë të një minute.
 */
export function TimeAgo({ value, className }: { value: Date | string; className?: string }) {
  const locale = useLocale();
  const [, tick] = React.useState(0);

  React.useEffect(() => {
    const timer = window.setInterval(() => tick((n) => n + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const iso = typeof value === "string" ? value : value.toISOString();

  return (
    <time dateTime={iso} title={formatDate(iso, locale)} className={className} suppressHydrationWarning>
      {timeAgo(iso, locale)}
    </time>
  );
}
