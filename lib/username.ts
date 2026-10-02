/**
 * Emri i përdoruesit: emri.mbiemri.
 *
 * Emri i përdoruesit është identiteti publik i studentit, prandaj duhet të
 * lexohet si emër, jo si kod. «petrit.cana» e thotë kush je, «petrit4729» jo.
 * Kur emri është zënë, shtohet një numër i vogël, dhe numërimi nis nga një.
 */

const MIN_LENGTH = 3;
const MAX_LENGTH = 30;

/**
 * Heq theksat dhe shenjat që nuk hyjnë në një emër përdoruesi.
 *
 * Shqipja ka ë dhe ç, dhe ato kthehen në e dhe c, jo hiqen: «Këlmendi» bëhet
 * «kelmendi», kurrë «klmendi».
 */
export function foldName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ë/g, "e")
    .replace(/ç/g, "c")
    .replace(/[’'`]/g, "")
    .replace(/[\s_-]+/g, ".")
    .replace(/[^a-z0-9.]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");
}

/** Baza e emrit të përdoruesit nga emri dhe mbiemri. */
export function usernameBase(firstName: string, lastName: string, fallbackEmail?: string): string {
  const first = foldName(firstName);
  const last = foldName(lastName);
  const joined = [first, last].filter(Boolean).join(".");

  if (joined.length >= MIN_LENGTH) return joined.slice(0, MAX_LENGTH);

  // Pa emër të përdorshëm, mbetet pjesa para @ e emailit. Ndodh rrallë, te
  // emailat me numër studenti, dhe është më mirë se një emër i sajuar.
  const fromEmail = foldName((fallbackEmail ?? "").split("@")[0] ?? "");
  return (fromEmail.length >= MIN_LENGTH ? fromEmail : `student.${Date.now().toString(36).slice(-4)}`).slice(0, MAX_LENGTH);
}

/** Emri i përdoruesit nga emri i plotë, kur emri dhe mbiemri nuk vijnë ndarë. */
export function usernameBaseFromFullName(name: string, fallbackEmail?: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  return usernameBase(first, last, fallbackEmail);
}

/** Varianti i radhës kur baza është e zënë: petrit.cana, petrit.cana1, petrit.cana2. */
export function usernameVariant(base: string, attempt: number): string {
  if (attempt === 0) return base;
  const suffix = String(attempt);
  return `${base.slice(0, MAX_LENGTH - suffix.length)}${suffix}`;
}

/** Krahasimi është pa dallim shkronjash të mëdha: Petrit.Cana është i njëjti emër. */
export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

/** A duket si emër përdoruesi, jo si email. Përdoret te hyrja. */
export function looksLikeUsername(value: string): boolean {
  return !value.includes("@");
}
