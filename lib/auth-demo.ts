/**
 * Të dhënat demonstruese të hapit me Google.
 *
 * Google OAuth ende nuk është lidhur me regjistrimin e ri: butoni «Vazhdo me
 * Google» pret rreth 1.4 sekonda dhe e çon studentin te `/regjistrohu/llogaria`
 * me këtë profil. Kur të lidhet, këto vlera vijnë nga sesioni i Google-it.
 */
export const DEMO_GOOGLE_PROFILE = {
  name: "Petrit Cana",
  email: "petrit.cana@student.uni-pr.edu",
} as const;

/** Sa zgjat «Duke u lidhur me Google…» te demo. */
export const DEMO_GOOGLE_DELAY_MS = 1400;
