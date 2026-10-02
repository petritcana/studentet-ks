/** Embeddings dhe ngjashmëria. */

export const EMBEDDING_DIMENSIONS = 64;
export const CHUNK_SIZE = 700;
export const CHUNK_OVERLAP = 80;

/** Ndan tekstin në copëza që mbivendosen pak, që fjalia të mos pritet përgjysmë. */
export function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= size) return clean ? [clean] : [];

  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    const end = Math.min(clean.length, start + size);
    let cut = end;

    if (end < clean.length) {
      const lastStop = clean.lastIndexOf(". ", end);
      if (lastStop > start + size / 2) cut = lastStop + 1;
    }

    chunks.push(clean.slice(start, cut).trim());
    if (cut >= clean.length) break;
    start = Math.max(cut - overlap, start + 1);
  }

  return chunks.filter(Boolean);
}

/**
 * Embedding deterministik me hashing i fjalëve.
 *
 * Nuk pretendon të jetë semantik: është vend-mbajtës i qëndrueshëm që lejon të
 * testohet i tërë tubi i RAG-ut pa çelës modeli. Me çelës, kjo funksion
 * zëvendësohet dhe asgjë tjetër nuk ndryshon.
 */
export function embed(text: string, dimensions = EMBEDDING_DIMENSIONS): number[] {
  const vector = new Array<number>(dimensions).fill(0);
  const words = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);

  for (const word of words) {
    let hash = 2166136261;
    for (let index = 0; index < word.length; index += 1) {
      hash ^= word.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    const slot = Math.abs(hash) % dimensions;
    vector[slot] += 1;
  }

  return normalize(vector);
}

export function normalize(vector: number[]): number[] {
  const length = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (length === 0) return vector;
  return vector.map((value) => value / length);
}

/** Kozinusi mes dy vektorëve të normalizuar është thjesht prodhimi skalar. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let sum = 0;
  for (let index = 0; index < a.length; index += 1) sum += a[index] * b[index];
  return sum;
}

export function serializeVector(vector: number[]): string {
  return JSON.stringify(vector.map((value) => Number(value.toFixed(6))));
}

export function parseVector(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "number") : [];
  } catch {
    return [];
  }
}

/**
 * Fjalet me kuptim te një teksti, pa ato lidhese që perputhen kudo.
 *
 * Një kopje e vetme e listes: e perdorin embedding-u, rikthimi dhe ofruesi
 * demonstrues, prandaj nuk mund te ndryshojne vec e vec.
 */
const STOP_WORDS = new Set([
  "cfare", "eshte", "jane", "sic", "per", "nga", "dhe", "apo", "nje", "qe", "sa",
  "kur", "ku", "pse", "sepse", "duke", "kete", "kjo", "ky", "ato", "ata", "nuk",
  "what", "is", "are", "the", "and", "or", "for", "to", "in", "on", "of", "how",
  "why", "when", "where", "this", "that", "with", "not", "does", "do", "can",
  // Fjalët e çdo pyetjeje studimi. Pa to, «Po për javën e fundit, çfarë të lexoj?»
  // përputhej me çdo material që përmend një javë ose një provim, dhe asistenti
  // sillte Agroteknikë për një studente të Arteve.
  "provim", "provimi", "provimin", "provimet", "pergatis", "pergatitem", "lexoj", "lexo",
  "mesoj", "meso", "javen", "jave", "javet", "fundit", "fund", "sot", "neser", "tani",
  "mund", "duhet", "shume", "mire", "edhe", "por", "ose", "pak", "cila", "cili", "cilat",
  "kam", "jam", "dua", "bej", "ben", "bejne", "sone", "tim", "time", "tende", "vetem", "gjithe",
  "cdo",
  "lenda", "lenden", "material", "materiale", "materialet", "shpjego", "shpjegoje",
  "exam", "exams", "study", "read", "week", "last", "next", "prepare", "should", "what",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

/** Sa shkronja të para duhen të përputhen që dy trajta te quhen e njejta fjalë. */
const STEM_LENGTH = 5;

/** Rrenja e perafert e një fjalë: aq sa e mban kuptimin, pa mbaresen. */
export function stem(word: string): string {
  return word.slice(0, STEM_LENGTH);
}

/**
 * A janë dy trajta e njëjta fjalë.
 *
 * Pesë shkronja të përbashkëta nuk mjaftojnë vetëm: «infla-cioni» dhe
 * «infla-macioni» i kanë, dhe një pyetje për inflacionin sillte material
 * mjekësor. Prefiksi i përbashkët duhet të jetë edhe mbi 70 për qind e fjalës më
 * të shkurtër: «mëlçia» dhe «mëlçisë» po, «inflacioni» dhe «inflamacioni» jo.
 */
export function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  let shared = 0;
  const limit = Math.min(a.length, b.length);
  while (shared < limit && a[shared] === b[shared]) shared += 1;
  return shared >= STEM_LENGTH && shared >= 0.7 * limit;
}

/** Sa nga fjalët e pyetjes dalin vërtet në tekst, si pjesë e njësisë. */
export function lexicalOverlap(question: string, text: string): number {
  const asked = tokenize(question);
  if (asked.length === 0) return 0;

  const present = [...new Set(tokenize(text))];
  const hits = asked.filter((word) => present.some((other) => sameWord(word, other))).length;
  return hits / asked.length;
}
