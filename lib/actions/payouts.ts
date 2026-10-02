"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { can, isTeacher } from "@/lib/permissions";
import { availableBalance, canRequestPayout, PAYOUT_MINIMUM_CENTS } from "@/lib/billing/ledger";
import { fail, succeed, type ActionState } from "./types";

/**
 * Bilanci i instruktorit.
 *
 * Llogaritet nga rreshtat e librit, kurrë nga një fushë e ruajtur veç: një total
 * i ruajtur mund të dalë jashtë sinkronit me rreshtat, dhe atëherë askush nuk
 * do ta dinte cili prej të dyve është i saktë.
 */
export async function getInstructorBalance(): Promise<{
  balanceCents: number;
  canRequest: boolean;
  minimumCents: number;
}> {
  const me = await requireUser();

  const entries = await db.ledgerEntry.findMany({
    where: { instructorId: me.id },
    select: { kind: true, instructorCents: true },
  });

  const balanceCents = availableBalance(entries);

  return {
    balanceCents,
    canRequest: canRequestPayout(balanceCents),
    minimumCents: PAYOUT_MINIMUM_CENTS,
  };
}

/** Kërkesa për tërheqje. Nën pragun minimal nuk pranohet. */
export async function requestPayout(note?: string): Promise<ActionState> {
  const me = await requireUser();

  if (!isTeacher(me.actor)) return fail("errors.forbidden");

  const entries = await db.ledgerEntry.findMany({
    where: { instructorId: me.id },
    select: { kind: true, instructorCents: true },
  });
  const balance = availableBalance(entries);

  if (!canRequestPayout(balance)) return fail("payouts.errorBelowMinimum");

  const pending = await db.payout.findFirst({
    where: { instructorId: me.id, status: { in: ["requested", "approved"] } },
    select: { id: true },
  });
  if (pending) return fail("payouts.errorPending");

  await db.payout.create({
    data: { instructorId: me.id, amountCents: balance, note: note?.trim() || null },
  });

  revalidatePath("/kurset/fitimet");
  revalidatePath("/admin");
  return succeed("payouts.requested");
}

/**
 * Vendimi i administratorit.
 *
 * Kur paguhet, shkruhet edhe rreshti i librit: pa të, bilanci do të mbetej i
 * njëjtë dhe i njëjti para do të tërhiqej dy herë.
 */
export async function resolvePayout(
  payoutId: string,
  decision: "approve" | "pay" | "reject",
  reference?: string,
): Promise<ActionState> {
  const me = await requireUser();

  if (!can(me.actor, "manage_payouts").allowed) return fail("errors.forbidden");

  const payout = await db.payout.findUnique({
    where: { id: payoutId },
    select: { id: true, instructorId: true, amountCents: true, currency: true, status: true },
  });
  if (!payout) return fail("errors.notFoundContent");

  if (decision === "pay") {
    if (payout.status === "paid") return fail("payouts.errorAlreadyPaid");

    await db.ledgerEntry.create({
      data: {
        instructorId: payout.instructorId,
        kind: "payout",
        grossCents: 0,
        platformCents: 0,
        instructorCents: payout.amountCents,
        currency: payout.currency,
        note: reference ?? null,
      },
    });
  }

  await db.payout.update({
    where: { id: payoutId },
    data: {
      status: decision === "approve" ? "approved" : decision === "pay" ? "paid" : "rejected",
      reference: reference?.trim() || null,
      resolvedAt: decision === "approve" ? null : new Date(),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/kurset/fitimet");
  return succeed();
}
