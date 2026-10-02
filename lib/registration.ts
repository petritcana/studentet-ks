import "server-only";

import { createHash, randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { mailReaches, sendMail } from "@/lib/email";
import { SITE } from "@/lib/site";
import { studentDomainFor } from "@/lib/student-domains";

/**
 * Regjistrimi i studentit: kodi i emailit studentor dhe hapat që e ndjekin.
 *
 *   emri, mbiemri, data e lindjes, emaili studentor, password-i
 *   -> kodi gjashtëshifror te emaili
 *   -> fotoja e ID-së studentore
 *   -> institucioni, programi, viti, profili
 *
 * Deri sa admini ta miratojë ID-në, llogaria vetëm shikon (`awaitingReview`).
 */

export const CODE_TTL_MINUTES = 15;
export const CODE_MAX_ATTEMPTS = 5;
/** Sa pritet para se kodi të ridërgohet. */
export const CODE_RESEND_SECONDS = 45;

export function hashCode(code: string) {
  return createHash("sha256").update(code.trim()).digest("hex");
}

/**
 * Kodi shfaqet te faqja vetëm kur emaili nuk arrin te ajo adresë (pa ofrues, ose
 * adresë jashtë `MAIL_ALLOW_ONLY`) dhe `.env` e lejon shprehimisht
 * (`MAIL_DEV_CODE=1`): lokalisht, që rrjedha të provohet. Në host ai rresht nuk
 * ekziston, dhe pa ofrues regjistrimi nuk kalon dot.
 */
export function devCodesVisible(email: string) {
  return !mailReaches(email) && process.env.MAIL_DEV_CODE === "1";
}

/*
  Kodi i fundit, vetëm lokalisht dhe vetëm kur `devCodesVisible`: faqja e
  kodit e shfaq që rrjedha të provohet pa ofrues emaili. Rri në kujtesën e
  procesit, kurrë në bazë.
*/
const devCodes: Map<string, string> = ((globalThis as { __sksDevCodes?: Map<string, string> }).__sksDevCodes ??=
  new Map());

export function peekDevCode(userId: string) {
  // Harta mbushet vetëm kur kodi lejohet të shfaqet (`devCodesVisible`).
  return process.env.MAIL_DEV_CODE === "1" ? (devCodes.get(userId) ?? null) : null;
}

/** Kodi aktiv i emailit studentor, nëse ka. */
export async function activeStudentCode(userId: string) {
  return db.emailCode.findFirst({
    where: { userId, purpose: "signup", usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, createdAt: true, expiresAt: true },
  });
}

export type IssueResult =
  | { ok: true; devCode?: string }
  | { ok: false; reason: "taken" | "notStudent" | "mail" | "wait" };

/** A e mban tjetërkush këtë adresë, si hyrje ose si email studentor. */
export async function studentEmailTaken(email: string, userId: string) {
  const other = await db.user.findFirst({
    where: { OR: [{ email }, { studentEmail: email }], NOT: { id: userId } },
    select: { id: true },
  });
  return Boolean(other);
}

/**
 * Krijon kodin dhe e dërgon. Kodi i vjetër shuhet, dhe në bazë mbetet vetëm
 * hash-i i të riut.
 */
export async function issueStudentCode(
  user: { id: string; firstName: string | null; name: string },
  rawEmail: string,
): Promise<IssueResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!studentDomainFor(email)) return { ok: false, reason: "notStudent" };
  if (await studentEmailTaken(email, user.id)) return { ok: false, reason: "taken" };

  const previous = await activeStudentCode(user.id);
  if (previous && previous.email === email && Date.now() - previous.createdAt.getTime() < CODE_RESEND_SECONDS * 1000) {
    return { ok: false, reason: "wait" };
  }

  const code = String(randomInt(100000, 1000000));
  await db.emailCode.updateMany({ where: { userId: user.id, purpose: "signup", usedAt: null }, data: { usedAt: new Date() } });
  await db.emailCode.create({
    data: {
      userId: user.id,
      email,
      purpose: "signup",
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
    },
  });

  const first = user.firstName ?? user.name.split(" ")[0];
  const sent = await sendMail({
    to: email,
    subject: `${code} është kodi yt për ${SITE.name}`,
    text: [
      `Përshëndetje ${first},`,
      "",
      `Kodi yt për të konfirmuar emailin studentor: ${code}`,
      `Vlen ${CODE_TTL_MINUTES} minuta.`,
      "",
      "Nëse nuk po regjistrohesh ti, injoroje këtë email.",
      "",
      `Hi ${first}, your ${SITE.name} code is ${code}. It works for ${CODE_TTL_MINUTES} minutes.`,
    ].join("\n"),
    html: codeEmailHtml(first, code),
  });
  if (!sent.ok) return { ok: false, reason: "mail" };

  if (!devCodesVisible(email)) {
    devCodes.delete(user.id);
    return { ok: true };
  }
  devCodes.set(user.id, code);
  return { ok: true, devCode: code };
}

export type ConfirmResult = { ok: true; email: string } | { ok: false; reason: "expired" | "wrong" | "tooMany" | "taken" };

/** Pesë prova, pastaj kodi digjet. Kodi i saktë e lidh emailin me llogarinë. */
export async function confirmStudentCode(userId: string, code: string): Promise<ConfirmResult> {
  const record = await db.emailCode.findFirst({
    where: { userId, purpose: "signup", usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return { ok: false, reason: "expired" };

  if (record.attempts >= CODE_MAX_ATTEMPTS) {
    await db.emailCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    return { ok: false, reason: "tooMany" };
  }

  if (record.codeHash !== hashCode(code)) {
    await db.emailCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, reason: record.attempts + 1 >= CODE_MAX_ATTEMPTS ? "tooMany" : "wrong" };
  }

  if (await studentEmailTaken(record.email, userId)) return { ok: false, reason: "taken" };

  const now = new Date();
  await db.emailCode.update({ where: { id: record.id }, data: { usedAt: now } });
  await linkStudentEmail(userId, record.email, now);
  return { ok: true, email: record.email };
}

/**
 * Emaili studentor u provua (me kod, ose nga Google për një adresë studentore).
 * Llogaria e regjistruar me email e ka atë edhe si adresë hyrjeje.
 */
export async function linkStudentEmail(userId: string, email: string, at = new Date()) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, emailVerified: true } });
  const sameAsLogin = user.email === email;

  await db.user.update({
    where: { id: userId },
    data: {
      studentEmail: email,
      ...(sameAsLogin && !user.emailVerified ? { emailVerified: at } : {}),
    },
  });

  const open = await db.verification.findFirst({
    where: { userId, kind: "student", status: { in: ["pending", "rejected"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (open) {
    await db.verification.update({ where: { id: open.id }, data: { emailVerifiedAt: at } });
  } else {
    await db.verification.create({
      data: { userId, kind: "student", status: "pending", emailVerifiedAt: at },
    });
  }
}

/** Institucioni i emailit studentor, për ta plotësuar vetë te hapat e mëpasshëm. */
export async function institutionForEmail(email: string | null | undefined) {
  if (!email) return null;
  const match = studentDomainFor(email);
  if (!match) return null;
  return db.university.findUnique({ where: { slug: match.institution }, select: { id: true, name: true, slug: true } });
}

function codeEmailHtml(first: string, code: string) {
  // Emaili ka stilet e veta brenda: klientët e postës nuk lexojnë tokenat e faqes.
  const safeName = first.replace(/[<>&"]/g, "");
  return `<!doctype html><html><body style="margin:0;background:#f3f6fc;font-family:Arial,sans-serif;color:#0f2451">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:460px;background:#ffffff;border-radius:18px;padding:28px">
<tr><td style="font-size:18px;font-weight:800">Studentët<span style="color:#1d5fe0">.KS</span></td></tr>
<tr><td style="padding-top:18px;font-size:15px;line-height:1.5">Përshëndetje ${safeName}, ky është kodi yt për të konfirmuar emailin studentor:</td></tr>
<tr><td style="padding:20px 0;font-size:34px;font-weight:800;letter-spacing:8px;text-align:center">${code}</td></tr>
<tr><td style="font-size:13px;line-height:1.5;color:#51607e">Vlen ${CODE_TTL_MINUTES} minuta. Nëse nuk po regjistrohesh ti, injoroje këtë email.</td></tr>
</table></td></tr></table></body></html>`;
}
