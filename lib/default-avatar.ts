/**
 * Avatari i parazgjedhur, kur studenti nuk ka foto profili.
 *
 * Një i vetëm për secilën gjini, i njëjtë për të gjithë: siluetë e sheshtë në
 * ngjyrat e markës, pa ngjyrë lëkure dhe pa tipare. Djalë për djemtë, vajzë për
 * vajzat, neutral kur studenti nuk e ka thënë. Gjinia nuk hamendësohet kurrë nga
 * emri: vjen vetëm nga zgjedhja e studentit.
 *
 * Shtohet te çdo lexim i `User.avatar` nga `lib/db.ts`, prandaj çdo vend që tregon
 * një person e merr pa ndryshim. Në bazë `avatar` mbetet `null` derisa të ngarkohet
 * një foto e vërtetë.
 */

export const GENDERS = ["male", "female"] as const;
export type Gender = (typeof GENDERS)[number];

export function isGender(value: unknown): value is Gender {
  return typeof value === "string" && (GENDERS as readonly string[]).includes(value);
}

const PREFIX = "/avatars/";

const FILES: Record<Gender | "neutral", string> = {
  male: `${PREFIX}djale.svg`,
  female: `${PREFIX}vajze.svg`,
  neutral: `${PREFIX}neutral.svg`,
};

export function defaultAvatarFor(gender: string | null | undefined): string {
  return isGender(gender) ? FILES[gender] : FILES.neutral;
}

/** A është kjo adresë avatari i parazgjedhur, pra studenti nuk ka foto të vetën. */
export function isDefaultAvatar(src: string | null | undefined): boolean {
  return !src || src.startsWith(PREFIX);
}
