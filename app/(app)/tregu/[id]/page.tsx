import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PostMedia } from "@/components/feed/post-media";
import { UserIdentityLine } from "@/components/identity/user-identity-line";
import { ListingActions } from "@/components/market/listing-actions";
import { toPublicAuthor } from "@/lib/dto";
import { formatMoney, timeAgo } from "@/lib/format";
import { getListing } from "@/lib/queries/market";
import { requireUser } from "@/lib/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  return { title: listing?.title ?? "" };
}

export const dynamic = "force-dynamic";

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, me, locale, t] = await Promise.all([params, requireUser(), getLocale(), getTranslations("market")]);

  const listing = await getListing(id);
  if (!listing) notFound();

  const isSeller = listing.sellerId === me.id;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <Link href="/tregu" className="inline-flex w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="size-4" />
        {t("title")}
      </Link>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          {listing.media.length > 0 ? (
            <PostMedia media={listing.media} />
          ) : null}

          <Card className="flex flex-col gap-2 p-4">
            <h2 className="text-sm font-semibold text-text">{t("description")}</h2>
            <p className="measure whitespace-pre-wrap text-sm leading-relaxed text-text">{listing.description}</p>
          </Card>
        </div>

        <aside className="flex flex-col gap-3">
          <Card className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="neutral">{t(`category_${listing.category}`)}</Badge>
              <Badge variant="neutral">{t(`condition_${listing.condition}`)}</Badge>
              {listing.status === "sold" ? <Badge variant="warning">{t("sold")}</Badge> : null}
            </div>

            <h1 className="text-pretty text-xl font-semibold tracking-tight text-text">{listing.title}</h1>

            <p className="tabular text-2xl font-semibold text-text">
              {listing.priceCents === null ? t("free") : formatMoney(listing.priceCents, "EUR", locale)}
            </p>

            <p className="flex items-center gap-1 text-xs text-text-muted">
              <MapPin className="size-3.5" aria-hidden />
              {listing.city} · {timeAgo(listing.createdAt, locale)}
            </p>

            <ListingActions listingId={listing.id} isSeller={isSeller} status={listing.status} />
          </Card>

          <Card className="flex flex-col gap-2 p-4">
            <p className="text-xs text-text-muted">{t("seller")}</p>
            <UserIdentityLine user={toPublicAuthor(listing.seller, locale)} size="sm" />
          </Card>

          <p className="px-1 text-xs text-text-muted">{t("safety")}</p>
        </aside>
      </div>
    </div>
  );
}
