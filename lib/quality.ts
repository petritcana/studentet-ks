/**
 * Rregullat e ruajtjes së cilësisë së materialeve.
 *
 * Jetojnë veç nga server actions sepse janë konstante që i lexon edhe UI-ja,
 * dhe një skedar "use server" lejon të eksportojë vetëm funksione asinkrone.
 */

/** Sa vlerësime pozitive duhen që materiali të kalojë nga "pending" në "verified". */
export const VERIFICATION_THRESHOLD = 3;

/** Nën këtë mesatare, me mbi AUTO_HIDE_MIN_RATINGS vlerësime, materiali fshihet vetë. */
export const AUTO_HIDE_RATING = 2;
export const AUTO_HIDE_MIN_RATINGS = 5;
