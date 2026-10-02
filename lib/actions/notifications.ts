"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { succeed, type ActionState } from "./types";

export async function markAllRead(): Promise<ActionState> {
  const me = await requireUser();
  await db.notification.updateMany({
    where: { userId: me.id, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/njoftimet");
  return succeed();
}

export async function markOneRead(id: string): Promise<ActionState> {
  const me = await requireUser();
  await db.notification.updateMany({ where: { id, userId: me.id }, data: { isRead: true } });
  return succeed();
}
