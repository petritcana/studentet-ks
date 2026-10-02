/**
 * Emri dhe emaili i një studenti.
 *
 * Platforma mbahet mbi njerëz të vërtetë: kërkesa ndjekjeje, rrethe fakulteti
 * dhe materiale që dikush i beson dikujt tjetër. Një «asd asd» me një adresë
 * njëpërdorimshe e prish atë besim para se të nisë, prandaj të dyja kontrollohen
 * te dera, jo më vonë.
 *
 * Kontrolli është i butë me qëllim: emrat shqiptarë, boshnjakë dhe turq kanë
 * shkronja dhe shenja që një rregull i ngushtë do t'i refuzonte padrejtësisht.
 */

/** Shkronjat e lejuara: latine me theks, plus apostrofi dhe viza te emrat e dyfishtë. */
const NAME_PART = /^[\p{L}][\p{L}'’-]*$/u;

export type NameVerdict = { ok: true; firstName: string; lastName: string } | { ok: false; reason: string };

/**
 * Emri i plotë: emri dhe mbiemri.
 *
 * Mbiemri kërkohet sepse pa të dy studentë me të njëjtin emër janë të padallueshëm
 * te kërkimi dhe te kërkesat e ndjekjes.
 */
export function validateFullName(raw: string): NameVerdict {
  const cleaned = raw.trim().replace(/\s+/g, " ");

  if (cleaned.length < 3 || cleaned.length > 60) return { ok: false, reason: "errorNameShort" };
  if (/\d/.test(cleaned)) return { ok: false, reason: "errorNameDigits" };
  if (/https?:|www\.|@/i.test(cleaned)) return { ok: false, reason: "errorNameLink" };

  const parts = cleaned.split(" ");
  if (parts.length < 2) return { ok: false, reason: "errorNameFull" };
  if (parts.length > 4) return { ok: false, reason: "errorNameShort" };
  if (!parts.every((part) => NAME_PART.test(part))) return { ok: false, reason: "errorNameLetters" };

  // Një pjesë e vetme shkronje është shkurtesë, jo emër: «A. Krasniqi» nuk mjafton.
  if (parts.some((part) => part.replace(/['’-]/g, "").length < 2)) {
    return { ok: false, reason: "errorNameLetters" };
  }

  return { ok: true, firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/**
 * Adresat njëpërdorimshe.
 *
 * Lista nuk pretendon të jetë e plotë, dhe nuk ka nevojë: konfirmimi me kod e
 * mban derën, kurse kjo listë i pret më të zakonshmet para se të dërgohet një
 * email që askush nuk do ta lexojë.
 */
const DISPOSABLE_DOMAINS = [
  "10minutemail.com",
  "20minutemail.com",
  "dispostable.com",
  "fakeinbox.com",
  "getnada.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "maildrop.cc",
  "maildrop.com",
  "mailinator.com",
  "mintemail.com",
  "mohmal.com",
  "sharklasers.com",
  "temp-mail.org",
  "tempmail.com",
  "tempmailo.com",
  "throwawaymail.com",
  "trashmail.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
];

export function emailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase().trim() ?? "";
}

export function isDisposableEmail(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.some((bad) => domain === bad || domain.endsWith(`.${bad}`));
}

/**
 * Emaili studentor me numër indeksi, p.sh. `pc12345@student.uni-pr.edu`.
 *
 * Adresa të tilla janë krejt të rregullta, por pjesa para @ nuk është emër.
 * Prandaj emri i përdoruesit nuk duhet të dalë kurrë prej saj kur studenti e ka
 * shkruar emrin e vet.
 */
export function looksLikeStudentId(email: string): boolean {
  const local = email.split("@")[0] ?? "";
  return /\d{3,}/.test(local) && local.replace(/\d/g, "").length <= 4;
}
