import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { ProGrantPanel, RevokeProButton } from "@/components/admin/pro-grant-panel";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminPro");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/**
 * «Jep Pro»: dhurata e Pro-së me orë, dhe kush e ka tani.
 *
 * Lista e sipërme tregon Pro-në aktive të dhuruar, me kohën kur mbaron. Poshtë
 * rri historiku: kush e dha, kujt dhe për sa orë.
 */
export default async function AdminProPage() {
  const [, locale, t, tAdmin] = await Promise.all([
    requireAdmin(),
    getLocale(),
    getTranslations("adminPro"),
    getTranslations("admin"),
  ]);
  const now = new Date();

  const [active, history] = await db.$transaction([
    db.user.findMany({
      where: { proEarnedUntil: { gt: now }, proGrantsReceived: { some: { revokedAt: null, until: { gt: now } } } },
      orderBy: { proEarnedUntil: "asc" },
      take: 50,
      select: { id: true, name: true, username: true, avatar: true, proEarnedUntil: true },
    }),
    db.proGrant.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        hours: true,
        until: true,
        reason: true,
        revokedAt: true,
        createdAt: true,
        user: { select: { name: true, username: true } },
        grantedBy: { select: { name: true } },
      },
    }),
  ]);

  // Datat shkruhen këtu, në server, që hidratimi të mos prishet.
  const at = (date: Date) => `${formatDate(date, locale)}, ${formatTime(date)}`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Link href="/admin" className="inline-flex w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="size-4" />
        {tAdmin("title")}
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text">{t("title")}</h1>
        <p className="measure text-sm text-text-muted">{t("subtitle")}</p>
      </header>

      <Card className="p-5">
        <ProGrantPanel />
      </Card>

      <section className="flex flex-col gap-2" data-pro-active>
        <h2 className="text-sm font-semibold text-text">{t("activeTitle", { count: active.length })}</h2>
        {active.length === 0 ? (
          <p className="text-sm text-text-muted">{t("activeEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {active.map((person) => (
              <li key={person.id} className="flex items-center gap-3 rounded-control border border-border bg-surface p-3" data-pro-active-user={person.username}>
                <Avatar name={person.name} src={person.avatar} size="sm" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold text-text">{person.name}</span>
                  <span className="text-xs text-text-muted">{t("until", { date: at(person.proEarnedUntil!) })}</span>
                </span>
                <RevokeProButton userId={person.id} name={person.name.split(" ")[0]} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text">{t("historyTitle")}</h2>
        {history.length === 0 ? (
          <p className="text-sm text-text-muted">{t("historyEmpty")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-control border border-border bg-surface">
            {history.map((grant) => (
              <li key={grant.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2.5 text-sm">
                <span className="font-semibold text-text">{grant.user.name}</span>
                <span className="text-text-muted">{t("historyHours", { hours: grant.hours })}</span>
                {grant.revokedAt ? <span className="text-xs font-semibold text-danger-text">{t("stopped")}</span> : null}
                <span className="ml-auto text-xs text-text-dim">
                  {t("historyBy", { name: grant.grantedBy.name, date: at(grant.createdAt) })}
                </span>
                {grant.reason ? <span className="w-full text-xs text-text-muted">{grant.reason}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
