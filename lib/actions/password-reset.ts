"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { isGoogleEnabled, signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { mailIsLive, sendMail } from "@/lib/email";
import { canContinue } from "@/lib/password-rules";
import {
  RESET_INTENT_COOKIE,
  RESET_MINUTES,
  RESET_PASS_COOKIE,
  createResetLink,
  findValidReset,
  isResetPassUsable,
  newResetIntent,
  spendResetPass,
} from "@/lib/password-reset";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";
import { SITE } from "@/lib/site";
import { fail, succeed, type ActionState } from "./types";

/**
 * «Ke harruar password-in?» me Google.
 *
 * Shënon qëllimin për dhjetë minuta dhe e çon studentin te Google. Kur Google e
 * konfirmon, `lib/auth.ts` lëshon lejen për atë llogari dhe studenti kthehet
 * vetë te `/harrova-password/i-ri`. Kush nuk ka llogari me atë email nuk krijon
 * një të re këtu: kthehet me shpjegim.
 */
export async function startGoogleReset(): Promise<ActionState> {
  if (!isGoogleEnabled) return fail("authFlow.resetGoogleOff");
  const jar = await cookies();
  jar.set(RESET_INTENT_COOKIE, newResetIntent(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  await signIn("google", { redirectTo: "/harrova-password/i-ri" });
  return succeed();
}

/** Password-i i ri pas Google-it: vetëm me lejen e nënshkruar për këtë llogari. */
export async function setPasswordAfterGoogle(password: string, confirm: string): Promise<ActionState> {
  const me = await getCurrentUser();
  const pass = (await cookies()).get(RESET_PASS_COOKIE)?.value;
  if (!me || !pass || !(await isResetPassUsable(pass, me.id))) return fail("authFlow.resetExpired");
  if (!canContinue(password, confirm)) return fail("authFlow.passwordWeak");

  await db.user.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  await spendResetPass(pass, me.id);
  return succeed("authFlow.resetDone");
}

/**
 * Lidhja me email, vetëm kur emaili është i lidhur me një ofrues: dërgohet vetë
 * dhe askush tjetër nuk e sheh. Përgjigjja është gjithmonë e njëjtë, që faqja të
 * mos tregojë kush ka llogari.
 */
export async function requestPasswordReset(identifier: string): Promise<ActionState> {
  if (!mailIsLive()) return fail("authFlow.resetMailOff");
  const value = identifier.trim().toLowerCase();
  if (value.length < 3) return fail("authFlow.forgotInvalid");

  const headerList = await headers();
  const who = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? "anonim";
  if (!rateLimit("passwordReset", who).ok) return fail("errors.rateLimited");

  const user = await db.user.findFirst({
    where: value.includes("@") ? { email: value } : { username: value },
    select: { id: true, name: true, email: true },
  });
  if (!user) return succeed();

  const link = await createResetLink(user.id);
  await sendMail({
    to: user.email,
    subject: `Rivendos password-in te ${SITE.name}`,
    text: [
      `Përshëndetje ${user.name.split(" ")[0]},`,
      "",
      `Kërkove të rivendosësh password-in. Hape këtë lidhje brenda ${RESET_MINUTES} minutave:`,
      link,
      "",
      "Nëse nuk e kërkove ti, injoroje këtë email: password-i yt mbetet i njëjti.",
    ].join("\n"),
  });
  return succeed();
}

/** Password-i i ri nga lidhja me email. */
export async function resetPassword(token: string, password: string, confirm: string): Promise<ActionState> {
  const reset = await findValidReset(token);
  if (!reset) return fail("authFlow.resetExpired");
  if (!canContinue(password, confirm)) return fail("authFlow.passwordWeak");

  await db.$transaction([
    db.user.update({ where: { id: reset.userId }, data: { passwordHash: await bcrypt.hash(password, 10) } }),
    db.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
  ]);
  return succeed("authFlow.resetDone");
}

/** Për formularin e fshehur te faqja: pa Google të lidhur, kthehet me shpjegim. */
export async function googleResetFormAction(): Promise<void> {
  const result = await startGoogleReset();
  if (!result.ok) redirect("/harrova-password?gabim=google-jo");
}
