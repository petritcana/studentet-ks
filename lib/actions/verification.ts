"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { awardContributionXp } from "@/lib/rewards";
import { recordAudit } from "@/lib/audit";
import { fail, succeed, type ActionState } from "./types";

/**
 * Verifikimi i studentit.
 *
 * Kodi i emailit studentor dhe fotoja e ID-së dërgohen te
 * `lib/actions/registration.ts`, të njëjtat për regjistrimin dhe për këtë faqe.
 * Këtu mbetet vendimi i moderimit: miratimi jep shenjën dhe hap llogarinë,
 * refuzimi kthen arsyen dhe lejon një foto të re.
 */

export async function reviewVerification(
  verificationId: string,
  decision: "approve" | "reject",
  reason?: string,
): Promise<ActionState> {
  const me = await requireUser();

  if (!can(me.actor, "review_verification").allowed) return fail("errors.forbidden");

  const record = await db.verification.findUnique({
    where: { id: verificationId },
    select: { id: true, userId: true, status: true, idDocumentRef: true },
  });
  if (!record) return fail("errors.notFoundContent");
  if (record.status !== "pending") return fail("verify.errorAlreadyReviewed");
  if (decision === "approve" && !record.idDocumentRef) return fail("verify.errorMissingDocs");

  const approved = decision === "approve";

  await db.verification.update({
    where: { id: verificationId },
    data: {
      status: approved ? "verified" : "rejected",
      reviewerId: me.id,
      reviewedAt: new Date(),
      rejectedReason: approved ? null : reason?.trim() || null,
      idDocumentRef: null,
      selfieRef: null,
    },
  });

  // Fotoja nuk mbahet pas vendimit: pa rreshtin e saj `/api/media` kthen 404.
  const assetId = record.idDocumentRef?.replace("/api/media/", "");
  if (assetId) await db.mediaAsset.deleteMany({ where: { id: assetId, ownerId: record.userId } });

  await db.user.update({
    where: { id: record.userId },
    data: {
      verification: approved ? "verified" : "rejected",
      isVerified: approved,
      // Miratimi e hap llogarinë; refuzimi e mban vetëm për shikim deri te foto e re.
      ...(approved ? { awaitingReview: false } : {}),
    },
  });

  if (approved) await awardContributionXp(record.userId, "verified");

  await recordAudit({
    actorId: me.id,
    action: approved ? "verify" : "reject",
    targetType: "verification",
    targetId: verificationId,
    reason,
  });

  await db.notification.create({
    data: {
      userId: record.userId,
      category: "system",
      type: approved ? "verification_approved" : "verification_rejected",
      payload: JSON.stringify(approved ? {} : { reason: reason ?? "" }),
    },
  });

  revalidatePath("/moderimi");
  revalidatePath("/verifikimi");
  return succeed(approved ? "verify.approved" : "verify.rejected");
}
