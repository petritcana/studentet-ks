import { MIN_AGE } from "./types";

/**
 * Mosha nga data e lindjes, pa server: e përdor edhe formulari, që studenti ta
 * dijë menjëherë, edhe serveri, që e kontrollon prapë.
 *
 * Data vjen si `YYYY-MM-DD` nga fusha e datës dhe lexohet si datë kalendarike,
 * pa orë: kështu askush nuk bëhet një ditë më i ri nga zona kohore.
 */

export const MAX_AGE = 100;

export function parseBirthDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  // 2007-02-30 nuk është datë: JavaScript do ta kthente në mars.
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

export function ageOn(birth: Date, now: Date = new Date()) {
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export type BirthVerdict = { ok: true; date: Date } | { ok: false; reason: "errorBirthInvalid" | "errorBirthYoung" };

/** Data e lindjes së pranuar: e vërtetë, jo në të ardhmen, dhe nga 16 vjeç. */
export function checkBirthDate(value: string, now: Date = new Date()): BirthVerdict {
  const date = parseBirthDate(value);
  if (!date) return { ok: false, reason: "errorBirthInvalid" };
  const age = ageOn(date, now);
  if (date > now || age > MAX_AGE) return { ok: false, reason: "errorBirthInvalid" };
  if (age < MIN_AGE) return { ok: false, reason: "errorBirthYoung" };
  return { ok: true, date };
}

/** Kufijtë e fushës së datës: më i riu i lejuar sot, më i vjetri i besueshëm. */
export function birthDateBounds(now: Date = new Date()) {
  const latest = new Date(Date.UTC(now.getUTCFullYear() - MIN_AGE, now.getUTCMonth(), now.getUTCDate()));
  const earliest = new Date(Date.UTC(now.getUTCFullYear() - MAX_AGE, 0, 1));
  return { min: earliest.toISOString().slice(0, 10), max: latest.toISOString().slice(0, 10) };
}
