/**
 * Sa pyetje bën një faqe, dhe sa kohë hanë.
 *
 * Serveri dhe baza rrinë në rajone të ndryshme, prandaj numri i pyetjeve është
 * pjesa më e rëndë e kohës së një faqeje. Pa e matur, optimizimi bëhet hamendje.
 * Ndizet vetëm me `DB_METRICS=1` dhe shkruan një rresht në log për çdo faqe.
 */
const enabled = process.env.DB_METRICS === "1";

let queries = 0;
let millis = 0;

export function dbMetricsEnabled() {
  return enabled;
}

export function recordQuery(ms: number) {
  if (!enabled) return;
  queries += 1;
  millis += ms;
}

/** Lexon numrat dhe i zeron, që faqja tjetër të nisë nga e para. */
export function takeQueryStats() {
  const stats = { queries, millis };
  queries = 0;
  millis = 0;
  return stats;
}
