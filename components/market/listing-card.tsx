import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ImageOff, MapPin } from "lucide-react";
import { formatMoney, timeAgo } from "@/lib/format";
import type { ListingCardDto } from "@/lib/queries/market";
import { cn } from "@/lib/utils";

export async function ListingCard({ listing }: { listing: ListingCardDto }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("market")]);
  const sold = listing.status === "sold";

  return (
    <Link
      href={`/tregu/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition-colors duration-150 hover:border-brand-500/40"
    >
      <div className="relative aspect-square bg-surface-2">
        {listing.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/media/${listing.cover.id}`}
            alt=""
            loading="lazy"
            className={cn("size-full object-cover", sold && "opacity-50")}
          />
        ) : (
          <span className="grid size-full place-items-center text-text-muted">
            <ImageOff className="size-6" aria-hidden />
          </span>
        )}
        {sold ? (
          <span className="absolute left-2 top-2 rounded-sm bg-bg/85 px-1.5 py-0.5 text-[11px] font-semibold text-text">
            {t("sold")}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-0.5 p-2.5">
        <p className="tabular text-sm font-semibold text-text">
          {listing.priceCents === null ? t("free") : formatMoney(listing.priceCents, "EUR", locale)}
        </p>
        <p className="truncate text-sm text-text group-hover:text-brand-500">{listing.title}</p>
        <p className="flex items-center gap-1 truncate text-xs text-text-muted">
          <MapPin className="size-3 shrink-0" aria-hidden />
          {listing.city} · {timeAgo(listing.createdAt, locale)}
        </p>
      </div>
    </Link>
  );
}
