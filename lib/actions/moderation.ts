"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireModerator } from "@/lib/session";
import { fail, succeed, type ActionState } from "./types";

export type ModerationDecision = "remove" | "dismiss" | "restore";

export async function resolveReport(
  reportId: string,
  decision: ModerationDecision,
  note?: string,
): Promise<ActionState> {
  const moderator = await requireModerator();

  const report = await db.report.findUnique({
    where: { id: reportId },
    select: { targetId: true, targetType: true },
  });
  if (!report) return fail("Ky raport s'ekziston.");

  const hide = decision === "remove";

  if (report.targetType === "post") {
    await db.post.updateMany({ where: { id: report.targetId }, data: { isHidden: hide } });
  } else if (report.targetType === "comment") {
    await db.comment.updateMany({ where: { id: report.targetId }, data: { isHidden: hide } });
  } else if (report.targetType === "material") {
    await db.material.updateMany({
      where: { id: report.targetId },
      data: { isHidden: hide, verificationStatus: hide ? "hidden" : "pending" },
    });
  } else if (report.targetType === "answer") {
    await db.answer.updateMany({ where: { id: report.targetId }, data: { isHidden: hide } });
  }

  await db.report.updateMany({
    where: { targetId: report.targetId, targetType: report.targetType },
    data: {
      status: decision === "dismiss" ? "dismissed" : "actioned",
      moderatorId: moderator.id,
      resolution: note?.trim() || null,
      resolvedAt: new Date(),
    },
  });

  await bumpWeeklyLog(decision);

  revalidatePath("/moderimi");
  revalidatePath("/moderimi/publik");
  return succeed(
    decision === "remove"
      ? "E hoqe përmbajtjen."
      : decision === "restore"
        ? "E ktheve përmbajtjen."
        : "E mbylle raportin pa masë.",
  );
}

async function bumpWeeklyLog(decision: ModerationDecision) {
  const weekOf = new Date();
  const day = weekOf.getDay() === 0 ? 7 : weekOf.getDay();
  weekOf.setDate(weekOf.getDate() - (day - 1));
  weekOf.setHours(0, 0, 0, 0);

  await db.moderationLog.upsert({
    where: { weekOf },
    create: {
      weekOf,
      removed: decision === "remove" ? 1 : 0,
      dismissed: decision === "dismiss" ? 1 : 0,
      reviewed: 1,
    },
    update: {
      removed: { increment: decision === "remove" ? 1 : 0 },
      dismissed: { increment: decision === "dismiss" ? 1 : 0 },
      reviewed: { increment: 1 },
    },
  });
}

export async function claimReport(reportId: string): Promise<ActionState> {
  const moderator = await requireModerator();
  await db.report.update({
    where: { id: reportId },
    data: { status: "reviewing", moderatorId: moderator.id },
  });
  revalidatePath("/moderimi");
  return succeed("E more në shqyrtim.");
}
