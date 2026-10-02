/**
 * Emailet studentore të Kosovës.
 *
 * Regjistrimi pranon vetëm adresa studentore: kodi provon që studenti e mban
 * adresën, dhe ID-ja që e shikon admini provon që është student. Lista u
 * hulumtua institucion për institucion (shtator 2026), me burimin te secili.
 *
 * `confirmed`: institucioni e thotë vetë që studentët marrin adresë aty.
 * `official`: domeni zyrtar i institucionit, pa konfirmim publik për studentët.
 * Pranohet, sepse kodi dhe ID-ja e mbulojnë rastin kur adresa nuk është studentore.
 *
 * Domenet vetëm të stafit (si `uni-pr.edu`) nuk hyjnë: profesorët vijnë më vonë,
 * me rrugën e tyre. Nëndomenet pranohen (`365.riinvest.net`).
 *
 * Skedar pa server: e përdor edhe formulari, që studenti ta shohë menjëherë
 * institucionin e tij ndërsa shkruan.
 */

export type DomainStatus = "confirmed" | "official";

export type StudentDomain = {
  domain: string;
  /** Slug-u i institucionit te katalogu (`prisma/academic/catalog.ts`). */
  institution: string;
  status: DomainStatus;
  source: string;
};

export const STUDENT_EMAIL_DOMAINS: readonly StudentDomain[] = [
  {
    domain: "student.uni-pr.edu",
    institution: "up",
    status: "confirmed",
    source: "https://uni-pr.edu/page.aspx?id=2,56",
  },
  {
    domain: "ubt-uni.net",
    institution: "ubt",
    status: "confirmed",
    source: "https://www.ubt-uni.net/en/study/current-students/",
  },
  {
    domain: "universitetiaab.com",
    institution: "aab",
    status: "confirmed",
    source: "https://eservice.aab-edu.net/Manuali-eService.pdf",
  },
  {
    domain: "aab-edu.net",
    institution: "aab",
    status: "official",
    source: "https://aab-edu.net",
  },
  {
    domain: "auk.org",
    institution: "rit",
    status: "confirmed",
    source: "https://www.rit.edu/kosovo/admissions",
  },
  {
    domain: "rit.edu",
    institution: "rit",
    status: "confirmed",
    source: "https://www.rit.edu/kosovo/admissions",
  },
  {
    domain: "uni-gjk.org",
    institution: "fehmi-agani",
    status: "confirmed",
    source: "https://uni-gjk.org/en/lajme/921/njoftim-per-qasje-ne-email-in-zyrtar",
  },
  {
    domain: "rezonanca-rks.com",
    institution: "rezonanca",
    status: "confirmed",
    source: "https://rezonanca-rks.com/official-email-and-access-to-the-moodle-platform/",
  },
  {
    domain: "unhz.eu",
    institution: "haxhi-zeka",
    status: "official",
    source: "https://unhz.eu",
  },
  {
    domain: "umib.net",
    institution: "isa-boletini",
    status: "official",
    source: "https://umib.net",
  },
  {
    domain: "ushaf.net",
    institution: "ushaf",
    status: "official",
    source: "https://ushaf.net",
  },
  {
    domain: "uni-gjilan.net",
    institution: "kadri-zeka",
    status: "official",
    source: "https://uni-gjilan.net",
  },
  {
    domain: "kolegji-heimerer.eu",
    institution: "heimerer",
    status: "official",
    source: "https://kolegji-heimerer.eu",
  },
  {
    domain: "kolegjifama.eu",
    institution: "fama",
    status: "official",
    source: "https://kolegjifama.eu",
  },
  {
    domain: "fama-edu.org",
    institution: "fama",
    status: "official",
    source: "https://kolegjifama.eu",
  },
];

/**
 * Institucione që i hulumtuam, por që s'janë ende te katalogu akademik: pa
 * programet e tyre studenti nuk e mbyll dot hyrjen. Regjistrimi ua thotë emrin
 * hapur, në vend të «domen i panjohur». Hyjnë te lista lart sapo katalogu t'i ketë.
 */
export const UPCOMING_INSTITUTION_DOMAINS: readonly { domain: string; name: string; source: string }[] = [
  {
    domain: "universum-ks.org",
    name: "Kolegji Universum",
    source: "https://www.researchgate.net/publication/338717605",
  },
  { domain: "riinvest.net", name: "Kolegji Riinvest", source: "https://riinvest.org/student-services-office/" },
  {
    domain: "kolegjidardania.com",
    name: "Kolegji Dardania",
    source: "https://kolegjidardania.com/en/current-students/",
  },
  { domain: "uni-prizren.com", name: "Universiteti i Prizrenit «Ukshin Hoti»", source: "https://uni-prizren.com" },
  { domain: "pjeterbudi-edu.com", name: "Kolegji Pjetër Budi", source: "https://pjeterbudi-edu.com" },
  { domain: "kolegjibiznesi.com", name: "Kolegji Biznesi", source: "https://kolegjibiznesi.com" },
  { domain: "kolegji-ispe.org", name: "Kolegji ISPE", source: "https://kolegji-ispe.org" },
  { domain: "kolegjiuniversi-edu.net", name: "Kolegji Universi", source: "https://kolegjiuniversi-edu.net" },
  { domain: "kolegjiglobus.com", name: "Kolegji Globus", source: "https://kolegjiglobus.com" },
  { domain: "ibcmitrovica.eu", name: "Kolegji IBC-M", source: "https://ibcmitrovica.eu" },
  { domain: "fsi-edu.net", name: "Kolegji FSI", source: "https://fsi-edu.net" },
  { domain: "uiliria.org", name: "Kolegji Iliria", source: "https://uiliria.org" },
];

/** Emri i shkurtër që sheh studenti nën fushën e emailit, ndërsa shkruan. */
export const INSTITUTION_NAMES: Record<string, string> = {
  up: "Universiteti i Prishtinës",
  ubt: "Kolegji UBT",
  aab: "Kolegji AAB",
  rit: "RIT Kosovo (A.U.K.)",
  "fehmi-agani": "Universiteti «Fehmi Agani», Gjakovë",
  rezonanca: "Kolegji Rezonanca",
  "haxhi-zeka": "Universiteti «Haxhi Zeka», Pejë",
  "isa-boletini": "Universiteti «Isa Boletini», Mitrovicë",
  ushaf: "Universiteti i Shkencave të Aplikuara, Ferizaj",
  "kadri-zeka": "Universiteti «Kadri Zeka», Gjilan",
  heimerer: "Kolegji Heimerer",
  fama: "Kolegji FAMA",
};

function domainOf(email: string) {
  const at = email.trim().toLowerCase().lastIndexOf("@");
  return at > 0 ? email.trim().toLowerCase().slice(at + 1) : "";
}

function matches(domain: string, allowed: string) {
  return domain === allowed || domain.endsWith(`.${allowed}`);
}

/** Domeni studentor që i përket adresës, ose null. */
export function studentDomainFor(email: string): StudentDomain | null {
  const domain = domainOf(email);
  if (!domain) return null;
  return STUDENT_EMAIL_DOMAINS.find((item) => matches(domain, item.domain)) ?? null;
}

/** Institucioni i hulumtuar që ende s'është te katalogu, për mesazhin e qartë. */
export function upcomingInstitutionFor(email: string) {
  const domain = domainOf(email);
  if (!domain) return null;
  return UPCOMING_INSTITUTION_DOMAINS.find((item) => matches(domain, item.domain)) ?? null;
}

export function isStudentEmail(email: string) {
  return studentDomainFor(email) !== null;
}

/** Domenet e një institucioni, për seed-in e `UniversityEmailDomain`. */
export function domainsForInstitution(slug: string) {
  return STUDENT_EMAIL_DOMAINS.filter((item) => item.institution === slug).map((item) => item.domain);
}
