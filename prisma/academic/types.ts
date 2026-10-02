/**
 * Katalogu akademik i Kosovës.
 *
 * Çdo institucion ka një skedar të vetin nën `prisma/academic/`, dhe të gjithë
 * ndjekin këtë formë. Hierarkia mbi programin është fakultative me qëllim: disa
 * institucione kanë fakultet dhe departament, të tjerat vetëm program, dhe një
 * strukturë e sajuar do të ishte gënjeshtër e vogël që prish çdo kërkim.
 *
 * Emrat ruhen shqip dhe anglisht, ashtu si i shkruan vetë institucioni.
 */

export type DegreeLevel =
  | "bachelor"
  | "professional_bachelor"
  | "integrated"
  | "master"
  | "phd";

export type SourceType = "official_institution" | "kaa" | "other_official";

export type ProgramSeed = {
  /** Emri shqip, ashtu si e publikon institucioni. */
  name: string;
  /** Emri anglisht. Kur institucioni nuk e ka, përkthehet për kuptim, jo fjalë për fjalë. */
  nameEn: string;
  slug: string;
  level: DegreeLevel;
  /** Fakulteti, me slug-un e përcaktuar te `FacultySeed`. Bosh kur institucioni s'ka fakultete. */
  faculty?: string;
  /** Departamenti brenda fakultetit, vetëm kur institucioni e përdor vërtet. */
  department?: string;
  /** Degët ku ofrohet. Bosh do të thotë kudo, ose institucion me një degë. */
  campuses?: string[];
  degreeTitle?: string;
  ects?: number;
  durationYears?: number;
  /** Drejtimet zyrtare brenda programit. */
  specializations?: { name: string; nameEn: string; slug: string }[];
  /** Data deri kur vlen akreditimi, ashtu si e jep lista zyrtare. */
  accreditationUntil?: string;
};

export type FacultySeed = {
  name: string;
  nameEn: string;
  slug: string;
  /** Shkurtesa e përdorur në UI dhe te ngjyra e fakultetit. */
  abbr: string;
  /** Çelësi i temës nga lib/faculties.ts. */
  color: string;
  icon: string;
  departments?: { name: string; nameEn: string; slug: string }[];
};

export type CampusSeed = {
  name: string;
  nameEn: string;
  slug: string;
  city: string;
};

export type InstitutionSeed = {
  slug: string;
  name: string;
  nameEn: string;
  abbr: string;
  city: string;
  type: "public" | "private";
  website: string;
  /** Domenet e emailit studentor. I pari përdoret si kryesori. */
  emailDomains: string[];
  campuses?: CampusSeed[];
  faculties?: FacultySeed[];
  programs: ProgramSeed[];
  /** Nga u mor lista dhe kur u pa e fundit. Kur mungon, vlejnë konstantet e katalogut. */
  source?: { type: SourceType; reference: string; verifiedAt: string; academicYear: string };
};
