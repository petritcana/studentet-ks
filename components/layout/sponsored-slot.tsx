import { getLocale } from "next-intl/server";
import { RailAd } from "@/components/ads/rail-ad";
import { pickIndex } from "@/lib/ads";
import { CACHE_TAGS, cachedBy } from "@/lib/cache";
import { db } from "@/lib/db";
import type { AdDto } from "@/lib/dto";

/**
 * Vendi 2 i shtyllës së djathtë: e sponsorizuar.
 *
 * Thirret vetëm pasi `shouldSeeAds` e ka lejuar, prandaj një përdorues PRO nuk e
 * ekzekuton kurrë këtë query. Stili vjen nga `AdCard`, i cili e mban etiketën
 * "Reklamë" gjithmonë të dukshme dhe kurrë nuk imiton një njoftim zyrtar.
 */
const loadAds = cachedBy(
  async () => {
    const now = new Date();
    return db.ad.findMany({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: { priority: "desc" },
      take: 6,
      select: {
      id: true,
      title: true,
      titleEn: true,
      body: true,
      bodyEn: true,
      image: true,
      url: true,
      cta: true,
      ctaEn: true,
        advertiser: { select: { name: true } },
      },
    });
  },
  ["reklamat-e-shtylles"],
  { revalidate: 300, tags: [CACHE_TAGS.ads] },
);

export async function SponsoredSlot({ userId }: { userId: string }) {
  const [locale, ads] = await Promise.all([getLocale(), loadAds()]);
  const english = locale === "en";
  if (ads.length === 0) return null;

  // E qendrueshme për perdoruesin dhe ditën: rifreskimi nuk e nderron reklamen.
  const ad = ads[pickIndex(ads.length, { userId, placement: "rail" })];

  const dto: AdDto = {
    id: ad.id,
    title: english ? ad.titleEn : ad.title,
    body: english ? ad.bodyEn : ad.body,
    image: ad.image,
    url: ad.url,
    cta: english ? ad.ctaEn : ad.cta,
    advertiser: ad.advertiser.name,
  };

  return <RailAd ad={dto} />;
}
