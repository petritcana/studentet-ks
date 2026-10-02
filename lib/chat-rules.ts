/**
 * Rregullat e bisedës: heshtja, rolet e grupit, linqet dhe thirrjet.
 *
 * Një vend i vetëm, që serveri dhe ndërfaqja të flasin me të njëjtat numra.
 * Kontrollet e vërteta bëhen te veprimet e serverit; këtu rrinë vetëm vlerat.
 */

/** Zgjedhjet e heshtjes, në orë. `always` do të thotë derisa studenti t'i ndezë vetë. */
export const MUTE_CHOICES = [1, 8, 24, 168, "always"] as const;
export type MuteChoice = (typeof MUTE_CHOICES)[number];

/** «Gjithmonë» ruhet si datë shumë e largët, që pyetja të mbetet një krahasim i thjeshtë. */
export const MUTED_FOREVER = new Date("2999-01-01T00:00:00.000Z");

export function muteUntil(choice: MuteChoice, now = new Date()) {
  return choice === "always" ? MUTED_FOREVER : new Date(now.getTime() + choice * 3_600_000);
}

export function isMuted(mutedUntil: Date | string | null | undefined, now = new Date()) {
  if (!mutedUntil) return false;
  return new Date(mutedUntil).getTime() > now.getTime();
}

export function isMutedForever(mutedUntil: Date | string | null | undefined) {
  return Boolean(mutedUntil) && new Date(mutedUntil!).getTime() >= MUTED_FOREVER.getTime();
}

export const GROUP_ROLES = ["admin", "member"] as const;
export type GroupRole = (typeof GROUP_ROLES)[number];

/**
 * Një link, i shkruar si çdo student: me `https://`, me `www.`, ose thjesht
 * `emri.com`. Kur grupi i ndalon linqet, ky është kontrolli.
 */
const LINK_PATTERN =
  /\b(?:https?:\/\/|www\.)[^\s<>]+|\b[a-z0-9][a-z0-9-]{0,62}\.(?:com|net|org|info|io|app|dev|me|al|ks|eu|edu|gov|co|ly|link|tv|gg)(?:\/[^\s<>]*)?\b/gi;

export function containsLink(text: string) {
  LINK_PATTERN.lastIndex = 0;
  return LINK_PATTERN.test(text);
}

export function extractLinks(text: string) {
  return [...text.matchAll(LINK_PATTERN)].map((match) => match[0].replace(/[).,;!?]+$/, ""));
}

/** Adresa e hapshme e një linku: `emri.com` merr `https://` përpara. */
export function linkHref(link: string) {
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

/** Kush nuk ka rrahur kaq sekonda, quhet jashtë thirrjes. */
export const CALL_SEAT_SECONDS = 25;

export function callSeatSince(now = Date.now()) {
  return new Date(now - CALL_SEAT_SECONDS * 1000);
}

/** Sa kohë i bie zilja atij që thirret. Te biseda me dy veta, pas kësaj thirrja quhet e humbur. */
export const RING_SECONDS = 45;

/** Sinjalet e një thirrjeje rrinë te tabela e dhomave të zërit, me këtë parashtesë. */
export function callSignalRoom(callId: string) {
  return `call:${callId}`;
}
