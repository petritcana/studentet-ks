"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isDemoMode } from "@/lib/auth";
import { DEMO_PRO_COOKIE } from "@/lib/constants";

/**
 * Çelësi «Shfaq si falas / Pro» i shiritit demo.
 *
 * Ruhet në cookie dhe lexohet nga `lib/session.ts`, i cili e mbivendos gjendjen
 * e Pro-s vetëm në modalitetin demo. Në prodhim ky funksion nuk bën asgjë.
 */
export async function setDemoProOverride(value: "free" | "pro" | null) {
  if (!isDemoMode) return;

  const jar = await cookies();
  if (value === null) jar.delete(DEMO_PRO_COOKIE);
  else jar.set(DEMO_PRO_COOKIE, value, { path: "/", maxAge: 60 * 60 * 12, sameSite: "lax" });

  revalidatePath("/", "layout");
}
