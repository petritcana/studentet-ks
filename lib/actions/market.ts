"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, requireParticipant } from "@/lib/session";
import { can } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { serializeMedia } from "@/lib/media";
import {
  MARKET_CATEGORIES,
  MARKET_CONDITIONS,
  MAX_ACTIVE_LISTINGS,
  MAX_LISTING_PHOTOS,
  MAX_PRICE_CENTS,
} from "@/lib/market";
import { startConversation } from "./messages";
import { fail, succeed, type ActionState } from "./types";

const listingSchema = z.object({
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().min(10).max(1000),
  priceCents: z.number().int().positive().max(MAX_PRICE_CENTS).nullable(),
  category: z.enum(MARKET_CATEGORIES),
  condition: z.enum(MARKET_CONDITIONS),
  city: z.string().trim().min(2).max(40),
  media: z
    .array(
      z.object({
        id: z.string().regex(/^[a-f0-9]{8,64}$/),
        kind: z.literal("image"),
        extension: z.string().regex(/^[a-z0-9]{2,6}$/),
        width: z.number().int().positive().nullable(),
        height: z.number().int().positive().nullable(),
        durationMs: z.null(),
      }),
    )
    .max(MAX_LISTING_PHOTOS),
});

export type ListingInput = z.input<typeof listingSchema>;

export async function createListing(input: ListingInput): Promise<ActionState & { id?: string }> {
  const me = await requireParticipant();
  if (!can(me.actor, "post").allowed) return fail("verify.lockedTitle");

  const limit = rateLimit("post", me.id);
  if (!limit.ok) return fail("errors.rateLimited");

  const parsed = listingSchema.safeParse(input);
  if (!parsed.success) return fail("errors.generic");

  const active = await db.marketListing.count({ where: { sellerId: me.id, status: "active" } });
  if (active >= MAX_ACTIVE_LISTINGS) return fail("market.tooMany");

  // Fotot duhet të jenë ngarkuar nga i njëjti person.
  const ids = parsed.data.media.map((item) => item.id);
  if (ids.length) {
    const owned = await db.mediaAsset.count({
      where: { id: { in: ids }, kind: "image", claims: { some: { userId: me.id } } },
    });
    if (owned !== ids.length) return fail("errors.generic");
  }

  const listing = await db.marketListing.create({
    data: {
      sellerId: me.id,
      title: parsed.data.title,
      description: parsed.data.description,
      priceCents: parsed.data.priceCents,
      category: parsed.data.category,
      condition: parsed.data.condition,
      city: parsed.data.city,
      media: serializeMedia(parsed.data.media),
      universityId: me.universityId,
    },
    select: { id: true },
  });

  revalidatePath("/tregu");
  return { ...succeed("market.published"), id: listing.id };
}

export async function setListingStatus(
  listingId: string,
  status: "active" | "sold" | "removed",
): Promise<ActionState> {
  const me = await requireUser();

  const listing = await db.marketListing.findUnique({ where: { id: listingId }, select: { sellerId: true } });
  if (!listing || listing.sellerId !== me.id) return fail("errors.forbidden");

  await db.marketListing.update({ where: { id: listingId }, data: { status, updatedAt: new Date() } });

  revalidatePath("/tregu");
  revalidatePath(`/tregu/${listingId}`);
  return succeed();
}

/** Hap bisedën me shitësin. */
export async function contactSeller(listingId: string): Promise<ActionState & { conversationId?: string }> {
  const me = await requireParticipant();

  const listing = await db.marketListing.findUnique({
    where: { id: listingId },
    select: { sellerId: true, status: true },
  });
  if (!listing || listing.status === "removed") return fail("errors.notFoundContent");
  if (listing.sellerId === me.id) return fail("social.errorSelf");

  return startConversation(listing.sellerId);
}
