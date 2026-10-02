import { db } from "@/lib/db";
import { parseMedia, type MediaRef } from "@/lib/media";
import { isMarketCategory } from "@/lib/market";

export type ListingCardDto = {
  id: string;
  title: string;
  priceCents: number | null;
  category: string;
  condition: string;
  city: string;
  cover: MediaRef | null;
  status: string;
  createdAt: string;
  sellerName: string;
};

export async function getListings(filters: { category?: string; q?: string; city?: string; sellerId?: string }) {
  const rows = await db.marketListing.findMany({
    where: {
      status: filters.sellerId ? { in: ["active", "sold"] } : "active",
      ...(isMarketCategory(filters.category) ? { category: filters.category } : {}),
      ...(filters.q ? { OR: [{ title: { contains: filters.q } }, { description: { contains: filters.q } }] } : {}),
      ...(filters.city ? { city: filters.city } : {}),
      ...(filters.sellerId ? { sellerId: filters.sellerId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      title: true,
      priceCents: true,
      category: true,
      condition: true,
      city: true,
      media: true,
      status: true,
      createdAt: true,
      seller: { select: { name: true } },
    },
  });

  return rows.map<ListingCardDto>((row) => ({
    id: row.id,
    title: row.title,
    priceCents: row.priceCents,
    category: row.category,
    condition: row.condition,
    city: row.city,
    cover: parseMedia(row.media)[0] ?? null,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    sellerName: row.seller.name,
  }));
}

export async function getListingCities() {
  const rows = await db.marketListing.findMany({
    where: { status: "active" },
    distinct: ["city"],
    select: { city: true },
    orderBy: { city: "asc" },
  });
  return rows.map((row) => row.city);
}

export async function getListing(id: string) {
  const row = await db.marketListing.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      priceCents: true,
      category: true,
      condition: true,
      city: true,
      media: true,
      status: true,
      createdAt: true,
      sellerId: true,
      seller: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          isVerified: true,
          year: true,
          proEarnedUntil: true,
          university: { select: { abbr: true } },
          faculty: { select: { name: true, nameEn: true, color: true } },
          subscriptions: { where: { status: "active" }, select: { status: true, expiresAt: true } },
        },
      },
    },
  });
  if (!row || row.status === "removed") return null;
  return { ...row, media: parseMedia(row.media) };
}
