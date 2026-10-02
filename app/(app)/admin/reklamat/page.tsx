import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { AdForm } from "@/components/admin/ad-form";
import { AdToggle } from "@/components/admin/ad-toggle";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminAds");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

export default async function AdminAdsPage() {
  const [, locale, t, tAdmin] = await Promise.all([
    requireAdmin(),
    getLocale(),
    getTranslations("adminAds"),
    getTranslations("admin"),
  ]);

  const ads = await db.ad.findMany({
    orderBy: { startsAt: "desc" },
    take: 40,
    select: {
      id: true,
      title: true,
      isActive: true,
      endsAt: true,
      budgetCents: true,
      priority: true,
      advertiser: { select: { name: true } },
      _count: { select: { impressions: true, clicks: true } },
    },
  });

  const now = new Date();
  const totalBudget = ads.reduce((sum, ad) => sum + ad.budgetCents, 0);

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

      <Card className="flex flex-wrap gap-6 p-4">
        <Stat label={t("activeCount")} value={formatNumber(ads.filter((ad) => ad.isActive && ad.endsAt > now).length, locale)} />
        <Stat label={t("soldTotal")} value={formatMoney(totalBudget, "EUR", locale)} />
        <Stat
          label={t("impressionsTotal")}
          value={formatNumber(ads.reduce((sum, ad) => sum + ad._count.impressions, 0), locale)}
        />
        <Stat
          label={t("clicksTotal")}
          value={formatNumber(ads.reduce((sum, ad) => sum + ad._count.clicks, 0), locale)}
        />
      </Card>

      <Card className="p-5">
        <AdForm />
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text">{t("list")}</h2>
        {ads.length === 0 ? (
          <p className="text-sm text-text-muted">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ads.map((ad) => {
              const expired = ad.endsAt < now;
              const ctr =
                ad._count.impressions > 0
                  ? ((ad._count.clicks / ad._count.impressions) * 100).toFixed(1)
                  : "0.0";

              return (
                <li key={ad.id}>
                  <Card className="flex flex-wrap items-center gap-3 p-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="neutral">{ad.advertiser.name}</Badge>
                        {!ad.isActive || expired ? <Badge variant="neutral">{t("inactive")}</Badge> : null}
                      </div>
                      <p className="truncate text-sm font-medium text-text">{ad.title}</p>
                      <p className="tabular text-xs text-text-muted">
                        {t("stats", {
                          impressions: formatNumber(ad._count.impressions, locale),
                          clicks: formatNumber(ad._count.clicks, locale),
                          ctr,
                        })}{" "}
                        · {t("until", { date: formatDate(ad.endsAt, locale) })}
                      </p>
                    </div>
                    <AdToggle id={ad.id} isActive={ad.isActive} />
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="tabular text-lg font-semibold text-text">{value}</span>
    </div>
  );
}
