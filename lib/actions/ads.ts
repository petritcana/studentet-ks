"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { CACHE_TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { fail, succeed, type ActionState } from "./types";

/**
 * Reklamat i shet dhe i fut admini.
 *
 * Nuk ka vetëshërbim për reklamuesin: një platformë e re shet me bisedë, jo me
 * formular publik. Këtu shënohet çfarë u shit, sa zgjat dhe sa u pa.
 */
const adSchema = z.object({
  advertiser: z.string().trim().min(2).max(60),
  title: z.string().trim().min(3).max(80),
  titleEn: z.string().trim().min(3).max(80),
  body: z.string().trim().min(3).max(300),
  bodyEn: z.string().trim().min(3).max(300),
  cta: z.string().trim().min(2).max(30),
  ctaEn: z.string().trim().min(2).max(30),
  url: z.string().trim().url().max(300),
  days: z.number().int().min(1).max(365),
  priority: z.number().int().min(0).max(10),
  budgetEur: z.number().int().min(0).max(100000),
});

export type AdInput = z.input<typeof adSchema>;

export async function createAd(input: AdInput): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = adSchema.safeParse(input);
  if (!parsed.success) return fail("adminAds.invalid");
  const data = parsed.data;

  const advertiser =
    (await db.advertiser.findFirst({ where: { name: data.advertiser } })) ??
    (await db.advertiser.create({
      data: { name: data.advertiser, contact: "kontakt@studentet.example" },
    }));

  const created = await db.ad.create({
    data: {
      advertiserId: advertiser.id,
      title: data.title,
      titleEn: data.titleEn,
      body: data.body,
      bodyEn: data.bodyEn,
      cta: data.cta,
      ctaEn: data.ctaEn,
      url: data.url,
      targeting: "{}",
      priority: data.priority,
      budgetCents: data.budgetEur * 100,
      isActive: true,
      endsAt: new Date(Date.now() + data.days * 86_400_000),
    },
    select: { id: true },
  });

  await recordAudit({ actorId: admin.id, action: "ad", targetType: "ad", targetId: created.id });

  revalidateTag(CACHE_TAGS.ads);
  revalidatePath("/", "layout");
  return succeed("adminAds.published");
}

export async function setAdActive(id: string, isActive: boolean): Promise<ActionState> {
  const admin = await requireAdmin();

  const existing = await db.ad.findUnique({ where: { id }, select: { isActive: true } });
  if (!existing) return fail("errors.notFoundContent");

  await db.ad.update({ where: { id }, data: { isActive } });
  await recordAudit({
    actorId: admin.id,
    action: "ad",
    targetType: "ad",
    targetId: id,
    before: existing,
  });

  revalidateTag(CACHE_TAGS.ads);
  revalidatePath("/", "layout");
  return succeed();
}
