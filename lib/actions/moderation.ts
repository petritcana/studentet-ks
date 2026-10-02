"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { onContentHidden, onContentRestored, onMaterialVerified } from "@/lib/competition/contributions";
import { requireModerator } from "@/lib/session";
import { revokeProDays, rewardMaterialApproved } from "@/lib/rewards";
import { CONTRIBUTION_XP } from "@/lib/xp";
import { recordAudit } from "@/lib/audit";
import { fail, succeed, type ActionState } from "./types";

/** Fsheh ose kthen përmbajtjen sipas llojit. Një vend i vetëm për të gjitha llojet. */
async function setHidden(targetId: string, targetType: string, hidden: boolean) {
  if (targetType === "post") {
    await db.post.updateMany({ where: { id: targetId }, data: { isHidden: hidden } });
  } else if (targetType === "comment") {
    await db.comment.updateMany({ where: { id: targetId }, data: { isHidden: hidden } });
  } else if (targetType === "material") {
    await db.material.updateMany({
      where: { id: targetId },
      data: { isHidden: hidden, verificationStatus: hidden ? "hidden" : "pending" },
    });
  } else if (targetType === "question") {
    await db.question.updateMany({ where: { id: targetId }, data: { isHidden: hidden } });
  } else if (targetType === "answer") {
    await db.answer.updateMany({ where: { id: targetId }, data: { isHidden: hidden } });
  }

  // Përmbajtja e fshehur nuk vazhdon të japë pikë gare; e rikthyera i rimerr.
  if (hidden) await onContentHidden(targetType, targetId);
  else await onContentRestored(targetType, targetId);
}

/**
 * Vendimi i moderatorit.
 *
 * Kurrë nuk ndëshkon publikisht: përmbajtja fshihet, personi merr njoftim privat
 * me arsyen, dhe raporti mban shënimin. Statistikat dalin të agreguara te faqja
 * publike, pa asnjë emër.
 */
export async function resolveReport(
  reportId: string,
  decision: "remove" | "restore" | "dismiss",
  note?: string,
): Promise<ActionState> {
  const me = await requireModerator();

  const report = await db.report.findUnique({
    where: { id: reportId },
    select: { id: true, targetId: true, targetType: true, reason: true },
  });
  if (!report) return fail("errors.notFoundContent");

  if (decision === "remove") await setHidden(report.targetId, report.targetType, true);
  if (decision === "restore") await setHidden(report.targetId, report.targetType, false);

  await db.report.updateMany({
    where: { targetId: report.targetId, targetType: report.targetType, status: { not: "actioned" } },
    data: {
      status: decision === "dismiss" ? "dismissed" : "actioned",
      moderatorId: me.id,
      resolution: `${decision}${note ? `: ${note}` : ""}`,
      resolvedAt: new Date(),
    },
  });

  await recordWeek(decision);
  await recordAudit({
    actorId: me.id,
    action: decision === "dismiss" ? "restore" : decision,
    targetType: report.targetType,
    targetId: report.targetId,
    reason: note,
  });

  revalidatePath("/moderimi");
  revalidatePath("/moderimi/raporti");
  return succeed("feed.reported");
}

/** Regjistri javor, i vetmi burim i faqes publike të transparencës. */
async function recordWeek(decision: "remove" | "restore" | "dismiss") {
  const weekOf = new Date();
  const day = weekOf.getDay() === 0 ? 7 : weekOf.getDay();
  weekOf.setDate(weekOf.getDate() - (day - 1));
  weekOf.setHours(0, 0, 0, 0);

  await db.moderationLog.upsert({
    where: { weekOf },
    create: {
      weekOf,
      removed: decision === "remove" ? 1 : 0,
      reviewed: 1,
      dismissed: decision === "dismiss" ? 1 : 0,
    },
    update: {
      removed: { increment: decision === "remove" ? 1 : 0 },
      reviewed: { increment: 1 },
      dismissed: { increment: decision === "dismiss" ? 1 : 0 },
    },
  });
}

/**
 * Verifikimi i materialit.
 *
 * Vetëm kjo rrugë jep XP kontributi dhe shtatë ditë Pro, dhe vetëm një herë:
 * `rewardMaterialApproved` e mban idempotencën përmes `rewardedAt`.
 */
export async function verifyMaterial(
  materialId: string,
  decision: "verify" | "reject",
  note?: string,
): Promise<ActionState> {
  const me = await requireModerator();

  const material = await db.material.findUnique({
    where: { id: materialId },
    select: { id: true, uploaderId: true, verificationStatus: true, rewardedAt: true },
  });
  if (!material) return fail("errors.notFoundContent");

  if (decision === "verify") {
    await db.material.update({
      where: { id: materialId },
      data: { verificationStatus: "verified", isHidden: false },
    });
    await rewardMaterialApproved(materialId);
    await onMaterialVerified(materialId, material.uploaderId);

    await db.notification.create({
      data: {
        userId: material.uploaderId,
        category: "progress",
        type: "material_approved",
        targetId: materialId,
        targetType: "material",
        payload: JSON.stringify({ days: 7 }),
      },
    });
  } else {
    await db.material.update({
      where: { id: materialId },
      data: { verificationStatus: "rejected", isHidden: true },
    });
    await onContentHidden("material", materialId);

    if (material.rewardedAt) {
      await db.user.update({
        where: { id: material.uploaderId },
        data: { xpContribution: { decrement: CONTRIBUTION_XP.materialApproved } },
      });
      await db.xpTransaction.updateMany({
        where: { targetId: materialId, reason: "material_approved", revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: note || "rejected" },
      });
      await revokeProDays(material.uploaderId, 7);
    }
  }

  await recordAudit({
    actorId: me.id,
    action: decision === "verify" ? "verify" : "reject",
    targetType: "material",
    targetId: materialId,
    reason: note,
  });

  revalidatePath("/moderimi");
  revalidatePath(`/materialet/${materialId}`);
  return succeed(decision === "verify" ? "material.nowVerified" : "feed.reported");
}

/** Marrja e raportit në shqyrtim, që dy moderatorë të mos punojnë të njëjtën gjë. */
export async function claimReport(reportId: string): Promise<ActionState> {
  const me = await requireModerator();
  await db.report.updateMany({
    where: { id: reportId, status: "open" },
    data: { status: "reviewing", moderatorId: me.id },
  });
  revalidatePath("/moderimi");
  return succeed();
}
