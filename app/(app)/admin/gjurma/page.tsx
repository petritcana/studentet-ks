import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("auditTitle"), robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

const TONES: Record<string, string> = {
  remove: "danger",
  reject: "danger",
  suspend: "danger",
  warn: "warning",
  restore: "success",
  verify: "success",
  payout: "brand",
  plan: "neutral",
  ad: "neutral",
  announcement: "neutral",
};

export default async function AuditPage() {
  const [, locale, t] = await Promise.all([
    requireAdmin(),
    getLocale(),
    getTranslations("admin"),
  ]);

  const entries = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      action: true,
      targetType: true,
      targetId: true,
      reason: true,
      createdAt: true,
      actor: { select: { name: true, username: true } },
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-text">
          <ScrollText className="size-5 text-brand-500" />
          {t("auditTitle")}
        </h1>
        <p className="measure text-sm text-text-muted">{t("auditBody")}</p>
      </header>

      {entries.length === 0 ? (
        <EmptyState illustration="search" title={t("auditEmpty")} />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center gap-3 py-3">
              <Badge variant={(TONES[entry.action] ?? "neutral") as never}>
                {t(`action_${entry.action}`)}
              </Badge>

              <span className="min-w-0 flex-1">
                <Link
                  href={`/u/${entry.actor.username}`}
                  className="text-sm font-medium text-text hover:text-brand-500"
                >
                  {entry.actor.name}
                </Link>
                <span className="tabular block truncate text-xs text-text-muted">
                  {entry.targetType} · {entry.targetId}
                </span>
                {entry.reason ? (
                  <span className="block truncate text-xs text-text-muted">{entry.reason}</span>
                ) : null}
              </span>

              <span className="tabular shrink-0 text-xs text-text-muted">
                {formatDateTime(entry.createdAt, locale)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
