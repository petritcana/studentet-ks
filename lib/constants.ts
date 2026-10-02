/**
 * Konstantet e ndara mes serverit dhe klientit.
 *
 * Skedarët me `"use server"` nuk lejojnë eksporte jo-asinkrone, prandaj emrat e
 * cookie-ve dhe kufijtë e ngjashëm jetojnë këtu, jo pranë veprimeve.
 */

/** Cookie-ja e çelësit «Shfaq si falas / Pro». Vlen vetëm në modalitetin demo. */
export const DEMO_PRO_COOKIE = "demo_pro";

/** Kufiri i ngarkimit, i njëjtë te forma dhe te veprimi i serverit. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const MILESTONE_DOWNLOADS = 100;

export const STORIES_PER_DAY = 10;

/** Sa jetojnë stories para se të fshihen vetë. */
export const STORY_LIFETIME_HOURS = 24;

/** Sa orë pret një pyetje para se të kërkohet ndihmë te gjenerata e kaluar. */
export const NUDGE_AFTER_HOURS = 6;
export const NUDGE_RECIPIENTS = 5;

export const APPLICATION_STATES = [
  "saved",
  "applied",
  "interview",
  "rejected",
  "accepted",
  "archived",
] as const;

export type ApplicationState = (typeof APPLICATION_STATES)[number];

/** Sa i gjatë mund të jetë një postim i zakonshëm. */
export const POST_TEXT_LIMIT = 1000;

/** Nga ky numër e tutje shfaqet numëruesi. */
export const POST_TEXT_COUNTER_FROM = 800;

/** Sa profile sugjerohen pasi hapet llogaria. Ndjekja aty është ftesë, jo kusht. */
export const ONBOARDING_SUGGESTIONS = 12;

/** Sa veta mund të ketë një grup bisede, bashkë me krijuesin. */
export const MAX_GROUP_CHAT_MEMBERS = 30;
