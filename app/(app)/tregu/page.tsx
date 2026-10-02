import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MapPin, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ListingCard } from "@/components/market/listing-card";
import { UrlFilterSelect } from "@/components/shared/url-filter-select";
import { KOSOVO_MUNICIPALITIES } from "@/lib/kosovo-places";
import { getListingCities, getListings } from "@/lib/queries/market";
import { MARKET_CATEGORIES, isMarketCategory } from "@/lib/market";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("market");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string; q?: string; qyteti?: string; imet?: string }>;
}) {
  const [me, params, t] = await Promise.all([requireUser(), searchParams, getTranslations("market")]);

  const category = isMarketCategory(params.kategoria) ? params.kategoria : undefined;
  const mine = params.imet === "1";

  const [listings, cities] = await Promise.all([
    getListings({ category, q: params.q?.trim() || undefined, city: params.qyteti || undefined, sellerId: mine ? me.id : undefined }),
    getListingCities(),
  ]);

  const cityOptions = [
    ...KOSOVO_MUNICIPALITIES,
    ...cities.filter((city) => !KOSOVO_MUNICIPALITIES.includes(city)).sort((a, b) => a.localeCompare(b, "sq")),
  ].map((city) => ({ value: city, label: city }));

  const href = (next: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    const merged = { kategoria: category, q: params.q, qyteti: params.qyteti, imet: mine ? "1" : undefined, ...next };
    for (const [key, value] of Object.entries(merged)) if (value) query.set(key, value);
    const text = query.toString();
    return text ? `/tregu?${text}` : "/tregu";
  };

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-150",
      active ? "border-brand-500/60 bg-brand-50 text-text" : "border-border bg-surface-2 text-text-muted hover:border-border-strong hover:text-text",
    );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <header className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-text">{t("title")}</h1>
          <p className="text-sm text-text-muted">{t("subtitle")}</p>
        </div>
        <Button asChild size="sm">
          <Link href="/tregu/shto">
            <Plus />
            {t("sell")}
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <form action="/tregu" className="flex min-w-0 flex-1 gap-2">
          {category ? <input type="hidden" name="kategoria" value={category} /> : null}
          {params.qyteti ? <input type="hidden" name="qyteti" value={params.qyteti} /> : null}
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-surface-2 px-4 transition-colors focus-within:border-brand-500">
            <Search className="size-4 shrink-0 text-text-muted" aria-hidden />
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-dim"
            />
          </label>
          <Button type="submit" variant="secondary" className="rounded-full">
            {t("filter")}
          </Button>
        </form>
        {/* Qyteti: të 38 komunat, plus çdo vend tjetër që kanë shpalljet. */}
        <UrlFilterSelect
          param="qyteti"
          label={t("city")}
          allLabel={t("allCities")}
          icon={<MapPin />}
          options={cityOptions}
        />
      </div>

      <nav aria-label={t("categories")} className="-mx-4 flex gap-1.5 overflow-x-auto scrollbar-none px-4 sm:mx-0 sm:px-0">
        <Link href={href({ kategoria: undefined, imet: undefined })} className={chip(!category && !mine)}>
          {t("all")}
        </Link>
        {MARKET_CATEGORIES.map((value) => (
          <Link key={value} href={href({ kategoria: value, imet: undefined })} className={chip(category === value && !mine)}>
            {t(`category_${value}`)}
          </Link>
        ))}
        <Link href={href({ kategoria: undefined, imet: "1" })} className={chip(mine)}>
          {t("mine")}
        </Link>
      </nav>

      {listings.length === 0 ? (
        <EmptyState
          illustration="search"
          title={mine ? t("emptyMine") : t("empty")}
          action={
            <Button asChild size="sm">
              <Link href="/tregu/shto">{t("sell")}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((listing) => (
            <li key={listing.id}>
              <ListingCard listing={listing} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
