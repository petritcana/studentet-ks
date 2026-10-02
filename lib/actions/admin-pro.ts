"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { requireAdmin } from "@/lib/session";
import { fail, succeed, type ActionState } from "./types";

/*
  Pro e dhuruar nga admini, me orë.

  Admini zgjedh personin dhe shkruan orët (48 orë = 2 ditë). Pro-ja shtohet mbi
  atë që ka personi tani (nuk e shkurton kurrë), ruhet te `proEarnedUntil` dhe
  mbaron vetë kur kalon koha: `isPro` e krahason me orën. Çdo dhuratë shkruhet
  te `ProGrant`, që të dihet kush e dha dhe kujt.
*/

/** Nga një orë deri në një vit. */
const MAX_HOURS = 24 * 365;

export type ProCandidate = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  email: string;
  proUntil: string | null;
};

export async function findProCandidates(query: string): Promise<ProCandidate[]> {
  await requireAdmin();
  const term = query.trim().replace(/^@/, "").slice(0, 60);
  if (term.length < 2) return [];
  const people = await db.user.findMany({
    where: {
      OR: [
        { name: { contains: term } },
        { username: { contains: term.toLowerCase() } },
        { email: { contains: term.toLowerCase() } },
      ],
    },
    orderBy: { name: "asc" },
    take: 8,
    select: { id: true, name: true, username: true, avatar: true, email: true, proEarnedUntil: true },
  });
  const now = Date.now();
  return people.map((person) => ({
    id: person.id,
    name: person.name,
    username: person.username,
    avatar: person.avatar,
    email: person.email,
    proUntil: person.proEarnedUntil && person.proEarnedUntil.getTime() > now ? person.proEarnedUntil.toISOString() : null,
  }));
}

const grantSchema = z.object({
  userId: z.string().min(1),
  hours: z.number().int().min(1).max(MAX_HOURS),
  reason: z.string().trim().max(200).optional(),
});

export async function grantPro(input: { userId: string; hours: number; reason?: string }): Promise<ActionState & { until?: string }> {
  const admin = await requireAdmin();
  const parsed = grantSchema.safeParse(input);
  if (!parsed.success) return fail("adminPro.errorHours", undefined, { max: MAX_HOURS });

  const person = await db.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true, proEarnedUntil: true } });
  if (!person) return fail("errors.notFoundContent");

  const now = new Date();
  // Shtohet mbi Pro-në që ka, nëse ende zgjat: dhurata nuk ia shkurton kurrë kohën.
  const start = person.proEarnedUntil && person.proEarnedUntil > now ? person.proEarnedUntil : now;
  const until = new Date(start.getTime() + parsed.data.hours * 3_600_000);

  await db.$transaction([
    db.user.update({ where: { id: person.id }, data: { proEarnedUntil: until } }),
    db.proGrant.create({
      data: {
        userId: person.id,
        grantedById: admin.id,
        hours: parsed.data.hours,
        until,
        reason: parsed.data.reason || null,
      },
    }),
  ]);

  await notify({
    userId: person.id,
    category: "pro",
    type: "pro_granted",
    actorId: admin.id,
    payload: { hours: parsed.data.hours },
  });

  revalidatePath("/admin/pro");
  return { ...succeed("adminPro.granted"), until: until.toISOString() };
}

/**
 * E ndal Pro-në e dhuruar ose të fituar tani. Abonimet me pagesë nuk preken:
 * ato i menaxhon faturimi.
 */
export async function revokePro(userId: string): Promise<ActionState> {
  await requireAdmin();
  const now = new Date();
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { proEarnedUntil: now } }),
    db.proGrant.updateMany({ where: { userId, revokedAt: null, until: { gt: now } }, data: { revokedAt: now } }),
  ]);
  revalidatePath("/admin/pro");
  return succeed("adminPro.revoked");
}
