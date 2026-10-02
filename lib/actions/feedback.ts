"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { resolveAttachments } from "@/lib/attachments";
import { db } from "@/lib/db";
import type { MediaRef } from "@/lib/media";
import { notify } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdmin, requireUser } from "@/lib/session";
import { fail, succeed, type ActionState } from "./types";

/*
  Raportet e testuesve: problem me platformën ose sugjerim.

  Faqja, pajisja dhe gabimet e fundit të JavaScript-it vijnë vetë nga shfletuesi,
  që admini ta gjejë problemin pa pyetur «ku ishe?». Çdo raport u shkon adminëve
  si njoftim dhe rri te `/admin/testimi`.
*/

const FEEDBACK_KINDS = ["bug", "suggestion"] as const;

const schema = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  message: z.string().trim().min(8).max(2000),
  path: z.string().trim().max(300),
  device: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  errors: z.array(z.string().max(500)).max(10).optional(),
});

export async function submitFeedback(input: {
  kind: string;
  message: string;
  path: string;
  device?: Record<string, string | number | boolean>;
  errors?: string[];
  media?: MediaRef[];
}): Promise<ActionState> {
  const me = await requireUser();
  const limit = rateLimit("feedback", me.id);
  if (!limit.ok) return fail("errors.rateLimited");

  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("feedback.errorShort");

  const media = await resolveAttachments(me.id, input.media ?? [], 1);
  const report = await db.feedback.create({
    data: {
      userId: me.id,
      kind: parsed.data.kind,
      message: parsed.data.message,
      path: parsed.data.path || "/",
      device: JSON.stringify(parsed.data.device ?? {}),
      errors: JSON.stringify(parsed.data.errors ?? []),
      media: JSON.stringify(media),
    },
    select: { id: true },
  });

  // Çdo admin e merr njoftimin; të palexuarat e së njëjtës ditë bashkohen në një rresht.
  const admins = await db.user.findMany({ where: { role: "admin", id: { not: me.id } }, select: { id: true } });
  for (const admin of admins) {
    await notify({
      userId: admin.id,
      category: "system",
      type: "feedback_new",
      actorId: me.id,
      targetId: report.id,
      targetType: "feedback",
      groupKey: `feedback:${new Date().toISOString().slice(0, 10)}`,
      payload: { kind: parsed.data.kind },
    });
  }

  revalidatePath("/admin/testimi");
  return succeed("feedback.sent");
}

/** Admini e shënon: e parë, e zgjidhur, ose e rihap. Me një shënim të shkurtër nëse do. */
export async function updateFeedback(input: { id: string; status: string; note?: string | null }): Promise<ActionState> {
  await requireAdmin();
  if (!["new", "seen", "resolved"].includes(input.status)) return fail("errors.generic");
  await db.feedback.update({
    where: { id: input.id },
    data: {
      status: input.status,
      ...(input.note !== undefined ? { adminNote: input.note?.trim().slice(0, 1000) || null } : {}),
    },
  });
  revalidatePath("/admin/testimi");
  return succeed();
}
