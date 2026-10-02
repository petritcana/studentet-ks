import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Rivendosja e password-it.
 *
 * Rruga kryesore është Google: studenti konfirmon me llogarinë Google që ka
 * emailin e tij, dhe kthehet vetë te «Password i ri». Askush tjetër, as admini,
 * nuk sheh as password-in, as ndonjë lidhje. Kur platforma ka email të lidhur,
 * ekziston edhe lidhja me email (një orë, një herë), që dërgohet vetë.
 */

/** Sa kohë vlen lidhja me email. */
export const RESET_MINUTES = 60;

/** Qëllimi: «po rivendos password-in», i vendosur para se të shkojë te Google. */
export const RESET_INTENT_COOKIE = "sks_pw_reset_intent";
/** Leja pas Google-it: vetëm për këtë llogari, e nënshkruar, dhjetë minuta. */
export const RESET_PASS_COOKIE = "sks_pw_reset_pass";
export const RESET_PASS_MINUTES = 10;

function secret() {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "studentet-ks-zhvillim";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(`password-reset:${payload}`).digest("hex");
}

/** Leja që lëshohet pasi Google konfirmon studentin. */
export function makeResetPass(userId: string, now = Date.now()) {
  const payload = `${userId}.${now + RESET_PASS_MINUTES * 60_000}`;
  return `${payload}.${sign(payload)}`;
}

/** A vlen leja për këtë llogari, tani. */
export function readResetPass(value: string | undefined | null, userId: string, now = Date.now()) {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [id, expiry, signature] = parts;
  if (id !== userId || Number(expiry) < now) return false;
  const expected = Buffer.from(sign(`${id}.${expiry}`), "hex");
  const given = Buffer.from(signature, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function newResetIntent() {
  return randomBytes(16).toString("hex");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Adresa e platformës për lidhjet që dalin jashtë saj (email). */
export function siteOrigin() {
  return (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Lidhja me email: krijohet e re dhe i shuan të vjetrat. Kthehet vetë lidhja;
 * në bazë mbetet vetëm hash-i i saj.
 */
export async function createResetLink(userId: string) {
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  await db.passwordReset.updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } });
  await db.passwordReset.create({
    data: { userId, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + RESET_MINUTES * 60_000) },
  });
  return `${siteOrigin()}/harrova-password/${token}`;
}

/** Lidhja e vlefshme: ekziston, s'është përdorur dhe s'ka skaduar. */
export async function findValidReset(token: string) {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const row = await db.passwordReset.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true, user: { select: { name: true, username: true } } },
  });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  return row;
}

/**
 * Leja e Google-it është njëpërdorimshe: pasi përdoret, hash-i i saj ruhet si i
 * shpenzuar. Kështu cookie-t nuk kanë nevojë të fshihen brenda veprimit, gjë që
 * do ta rifreskonte faqen para se studenti ta shihte suksesin.
 */
export async function isResetPassUsable(value: string | undefined | null, userId: string) {
  if (!value || !readResetPass(value, userId)) return false;
  const spent = await db.passwordReset.findUnique({ where: { tokenHash: hashToken(value) }, select: { id: true } });
  return !spent;
}

export async function spendResetPass(value: string, userId: string) {
  const now = new Date();
  await db.passwordReset.create({ data: { userId, tokenHash: hashToken(value), expiresAt: now, usedAt: now } });
}
