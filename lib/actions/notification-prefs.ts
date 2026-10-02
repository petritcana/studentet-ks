"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { NOTIFICATION_CATEGORIES } from "@/lib/notifications";
import { requireUser } from "@/lib/session";
import { fail, succeed, type ActionState } from "./types";

/**
 * Preferencat e njoftimeve.
 *
 * Çelësat ekzistonin te baza prej kohësh, por asgjë nuk i lexonte: `lib/notify.ts`
 * tani i pyet para se të shkruajë një rresht. Prandaj fikja e një kategorie e
 * ndal vërtet njoftimin, jo vetëm e fsheh.
 */
const schema = z.object({
  category: z.enum(NOTIFICATION_CATEGORIES),
  inApp: z.boolean(),
});

export async function saveNotificationPref(
  input: z.input<typeof schema>,
): Promise<ActionState> {
  const me = await requireUser();

  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("errors.generic");

  await db.notificationSetting.upsert({
    where: { userId_category: { userId: me.id, category: parsed.data.category } },
    create: { userId: me.id, category: parsed.data.category, inApp: parsed.data.inApp },
    update: { inApp: parsed.data.inApp },
  });

  revalidatePath("/cilesimet");
  return succeed("settings.saved");
}
