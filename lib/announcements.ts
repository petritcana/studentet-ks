/**
 * Njoftimet e platformës.
 *
 * Kjo është hapësira ku Studentët.KS flet vetë: njoftime të rëndësishme, evente,
 * udhëtime dhe takime që i organizojmë ne. Rri e para në shtyllën e majtë, para
 * reklamave dhe punëve, dhe nuk stilohet kurrë si reklamë.
 */

export const ANNOUNCEMENT_KINDS = ["notice", "event", "trip", "meetup"] as const;
export type AnnouncementKind = (typeof ANNOUNCEMENT_KINDS)[number];

export function isAnnouncementKind(value: string): value is AnnouncementKind {
  return (ANNOUNCEMENT_KINDS as readonly string[]).includes(value);
}

/** Nga ky prag e lart njoftimi shënohet si i rëndësishëm dhe del i pari. */
export const IMPORTANT_PRIORITY = 2;

/** Sa njoftime dalin në shtyllë. Të tjerat lexohen te faqja e plotë. */
export const RAIL_ANNOUNCEMENTS = 4;
