"use server";

import { checkBirthDate } from "@/lib/age";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { canContinue } from "@/lib/password-rules";
import { getCurrentUser } from "@/lib/session";
import { fail, type ActionState } from "./types";

/**
 * Password-i i Studentët.KS pas hyrjes së parë me Google.
 *
 * Google e ka vërtetuar emailin; ky password është vetëm për platformën, që
 * studenti të hyjë edhe me username ose email. Vendoset një herë: kush e ka
 * tashmë, kalon drejt te onboarding-u. Pas tij vazhdon onboarding-u ekzistues
 * (Institucioni, Fakulteti, Niveli, Viti, Foto, Bio, Qyteti).
 */
export async function setGooglePassword(password: string, confirm: string, birthDate: string): Promise<ActionState> {
  const me = await getCurrentUser();
  if (!me) redirect("/regjistrohu");
  if (!canContinue(password, confirm)) return fail("authFlow.passwordWeak");

  // Edhe me Google platforma pranon vetëm nga 16 vjeç.
  const birth = checkBirthDate(birthDate);
  if (!birth.ok) return fail(`auth.${birth.reason}`);

  const record = await db.user.findUnique({ where: { id: me.id }, select: { passwordHash: true } });
  if (!record?.passwordHash) {
    await db.user.update({
      where: { id: me.id },
      data: { passwordHash: await bcrypt.hash(password, 10), birthDate: birth.date, ageConfirmedAt: new Date() },
    });
  }

  redirect("/regjistrohu");
}

/** «Përdor një llogari tjetër»: del nga llogaria e Google-it dhe nis prapë nga «Mirë se vjen». */
export async function switchGoogleAccount() {
  await signOut({ redirect: false });
  redirect("/regjistrohu");
}
