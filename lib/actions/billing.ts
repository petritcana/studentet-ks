"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getProvider } from "@/lib/billing/providers";
import { applyStudentDiscount, type ProviderCode } from "@/lib/billing/types";
import { grantProDays } from "@/lib/rewards";
import { rateLimit } from "@/lib/rate-limit";
import { canExchange, EXCHANGE_RATES, xpForDays } from "@/lib/xp";
import { fail, succeed, type ActionState } from "./types";

const PROVIDERS: ProviderCode[] = ["paddle", "localbank", "transfer", "voucher", "xp", "mock"];

export type CheckoutState = ActionState & {
  redirectUrl?: string;
  reference?: string;
  instructionsKey?: string;
  settled?: boolean;
};

/**
 * Nisja e blerjes.
 *
 * Çmimi lexohet nga tabela `Plan`, kurrë nga klienti: një formë e ndryshuar në
 * shfletues nuk mund ta ulë shumën. Zbritja jepet vetëm nëse emaili institucional
 * është vërtet i verifikuar.
 */
export async function startCheckout(
  planCode: string,
  providerCode: string,
): Promise<CheckoutState> {
  const me = await requireUser();

  if (!PROVIDERS.includes(providerCode as ProviderCode)) return fail("errors.generic");

  const plan = await db.plan.findUnique({ where: { code: planCode } });
  if (!plan || !plan.isActive) return fail("errors.notFoundContent");

  const amountCents = me.isVerified
    ? applyStudentDiscount(plan.priceCents, plan.studentDiscount)
    : plan.priceCents;

  const provider = getProvider(providerCode as ProviderCode);
  if (!provider.isAvailable()) return fail("proPage.paymentUnavailable");

  const result = await provider.createCheckout({
    userId: me.id,
    planCode: plan.code,
    amountCents,
    currency: plan.currency,
    hasStudentDiscount: me.isVerified,
    locale: me.locale ?? "sq",
  });

  if (result.kind === "error") return fail(result.messageKey);
  if (result.kind === "redirect") return { ...succeed(), redirectUrl: result.url };
  if (result.kind === "instructions") {
    return {
      ...succeed(),
      reference: result.reference,
      instructionsKey: result.instructionsKey,
    };
  }

  // Zgjidhur menjëherë: vetëm mock dhe XP arrijnë këtu.
  await db.subscription.create({
    data: {
      userId: me.id,
      planId: plan.id,
      status: "active",
      source: "payment",
      expiresAt: new Date(Date.now() + plan.months * 30 * 86_400_000),
    },
  });

  revalidatePath("/une/pro");
  revalidatePath("/", "layout");
  return { ...succeed("proPage.exchangeDone"), settled: true };
}

/** Shlyerja e një kodi voucher. Kodi konsumohet një herë të vetme. */
export async function redeemVoucher(rawCode: string): Promise<ActionState> {
  const me = await requireUser();

  const limit = rateLimit("exchange", me.id);
  if (!limit.ok) return fail("errors.rateLimited");

  const code = rawCode.trim().toUpperCase();
  if (code.length < 4) return fail("proPage.voucherInvalid");

  const voucher = await db.voucher.findUnique({ where: { code } });
  if (!voucher || voucher.usedBy) return fail("proPage.voucherInvalid");

  await db.voucher.update({
    where: { id: voucher.id },
    data: { usedBy: me.id, usedAt: new Date() },
  });

  await db.subscription.create({
    data: {
      userId: me.id,
      status: "active",
      source: "voucher",
      expiresAt: new Date(Date.now() + voucher.days * 86_400_000),
    },
  });

  revalidatePath("/une/pro");
  revalidatePath("/", "layout");
  return succeed("proPage.voucherDone");
}

/**
 * Këmbimi i XP-së së kontributit në ditë Pro.
 *
 * XP-ja e aktivitetit nuk hyn kurrë këtu. Llogaritë nën shtatë ditë nuk këmbejnë,
 * sepse ndryshe një fermë llogarish do të prodhonte Pro falas.
 */
export async function exchangeXp(days: number): Promise<ActionState> {
  const me = await requireUser();

  const limit = rateLimit("exchange", me.id);
  if (!limit.ok) return fail("errors.rateLimited");

  const allowed = [1, 30, ...EXCHANGE_RATES.map((tier) => tier.days)];
  if (!allowed.includes(days)) return fail("errors.generic");

  const gate = canExchange({ createdAt: me.createdAt, xpContribution: me.xpContribution });
  if (!gate.ok) {
    return fail(gate.reason === "too-new" ? "proPage.exchangeTooNew" : "proPage.exchangeNotEnough");
  }

  const cost = xpForDays(days);
  if (me.xpContribution < cost) return fail("proPage.exchangeNotEnough");

  await db.user.update({
    where: { id: me.id },
    data: { xpContribution: { decrement: cost } },
  });
  await db.xpTransaction.create({
    data: { userId: me.id, kind: "contribution", amount: -cost, reason: "exchange" },
  });

  await grantProDays(me.id, days);

  revalidatePath("/une/pro");
  revalidatePath("/", "layout");
  return succeed("proPage.exchangeDone");
}
