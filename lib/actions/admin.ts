"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { fail, succeed, type ActionState } from "./types";

/**
 * Konfirmimi manual i transfertës bankare.
 *
 * Kjo është e vetmja rrugë me të cilën një transfertë bëhet abonim: klienti nuk
 * e vendos kurrë vetë. Plani nxirret nga kodi i referencës, që admini të mos
 * shkruajë shuma me dorë.
 */
export async function confirmPayment(paymentId: string): Promise<ActionState> {
  await requireAdmin();

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, userId: true, status: true, reference: true },
  });
  if (!payment) return fail("errors.notFoundContent");
  if (payment.status === "paid") return succeed("admin.confirmed");

  const planCode = payment.reference?.split("-")[1]?.toLowerCase() ?? "";
  const plan = await db.plan.findFirst({
    where: { code: { contains: planCode } },
    orderBy: { sortOrder: "asc" },
  });

  await db.payment.update({ where: { id: paymentId }, data: { status: "paid" } });

  await db.subscription.create({
    data: {
      userId: payment.userId,
      planId: plan?.id ?? null,
      status: "active",
      source: "payment",
      expiresAt: new Date(Date.now() + (plan?.months ?? 1) * 30 * 86_400_000),
    },
  });

  await db.notification.create({
    data: {
      userId: payment.userId,
      category: "system",
      type: "pro_earned",
      payload: JSON.stringify({}),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/une/pro");
  return succeed("admin.confirmed");
}

/** Kodet e ambasadorëve. Gjenerohen në grupe, që të gjurmohen si grup. */
export async function generateVouchers(
  count: number,
  days: number,
  batch: string,
): Promise<ActionState & { codes?: string[] }> {
  await requireAdmin();

  const safeCount = Math.min(Math.max(1, count), 200);
  const codes: string[] = [];

  for (let index = 0; index < safeCount; index += 1) {
    const code = `SKS${randomBytes(4).toString("hex").toUpperCase()}`;
    await db.voucher.create({ data: { code, days, batch } });
    codes.push(code);
  }

  revalidatePath("/admin");
  return { ...succeed(), codes };
}
