import { db } from "@/lib/db";
import { normalizeSearch } from "@/lib/search-text";

/**
 * Katalogu akademik për përzgjedhësin.
 *
 * Asgjë nuk dërgohet e tëra te shfletuesi: institucioni ngarkon degët dhe
 * fakultetet, fakulteti ngarkon programet, programi ngarkon drejtimet. Kërkimi
 * bëhet mbi një çelës pa theks, që «financa» të gjejë «Financa» dhe «banking»
 * të gjejë «Banka dhe Financa».
 */

export type DegreeLevel = "bachelor" | "professional_bachelor" | "integrated" | "master" | "phd";

export const DEGREE_LEVELS: DegreeLevel[] = [
  "bachelor",
  "professional_bachelor",
  "integrated",
  "master",
  "phd",
];

export { normalizeSearch };

export type InstitutionOption = {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  abbr: string;
  city: string;
  type: string;
};

export async function searchInstitutions(query: string): Promise<InstitutionOption[]> {
  const needle = normalizeSearch(query);

  const rows = await db.university.findMany({
    where: { active: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, nameEn: true, abbr: true, city: true, type: true },
  });

  if (!needle) return rows;

  return rows.filter((row) =>
    [row.name, row.nameEn, row.abbr, row.city].some((field) => normalizeSearch(field).includes(needle)),
  );
}

/** Një institucion i vetëm, me llojin që vendos nëse ka hapin e fakultetit. */
export async function getInstitution(id: string) {
  return db.university.findUnique({
    where: { id },
    select: { id: true, slug: true, name: true, nameEn: true, abbr: true, city: true, type: true },
  });
}

export async function getCampuses(universityId: string) {
  return db.campus.findMany({
    where: { universityId, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, nameEn: true, city: true },
  });
}

/** Fakultetet që vërtet kanë programe aktive në atë nivel. */
export async function getFaculties(universityId: string, level?: DegreeLevel) {
  const faculties = await db.faculty.findMany({
    where: {
      universityId,
      programs: { some: { active: true, ...(level ? { degreeLevel: level } : {}) } },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, nameEn: true, abbr: true, color: true },
  });

  return faculties;
}

/** Nivelet që ky institucion i ofron vërtet. */
export async function getLevels(universityId: string): Promise<DegreeLevel[]> {
  const rows = await db.studyProgram.findMany({
    where: { universityId, active: true },
    distinct: ["degreeLevel"],
    select: { degreeLevel: true },
  });

  const found = new Set(rows.map((row) => row.degreeLevel));
  return DEGREE_LEVELS.filter((level) => found.has(level));
}

export type ProgramOption = {
  id: string;
  name: string;
  nameEn: string;
  level: DegreeLevel;
  /** Shkurtesa e titullit, ashtu si e shkruan lista: BSc, BA, LLB, MSc, PhD. */
  degreeTitle: string | null;
  ects: number | null;
  /** Sa vite zgjat, që hapi i vitit të mos ofrojë një vit që nuk ekziston. */
  years: number;
  facultyName: string | null;
  campusName: string | null;
  specializations: { id: string; name: string; nameEn: string }[];
};

export async function searchPrograms(input: {
  universityId: string;
  campusId?: string;
  facultyId?: string;
  level?: DegreeLevel;
  query?: string;
  take?: number;
}): Promise<ProgramOption[]> {
  const needle = normalizeSearch(input.query ?? "");

  const rows = await db.studyProgram.findMany({
    where: {
      universityId: input.universityId,
      active: true,
      ...(input.campusId ? { campusId: input.campusId } : {}),
      ...(input.facultyId ? { facultyId: input.facultyId } : {}),
      ...(input.level ? { degreeLevel: input.level } : {}),
      ...(needle ? { searchKey: { contains: needle } } : {}),
    },
    orderBy: [{ name: "asc" }, { degreeLevel: "asc" }],
    take: input.take ?? 60,
    select: {
      id: true,
      name: true,
      nameEn: true,
      degreeLevel: true,
      degreeTitle: true,
      ects: true,
      faculty: { select: { name: true, nameEn: true } },
      campus: { select: { name: true } },
      specializations: {
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, nameEn: true },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    nameEn: row.nameEn,
    level: row.degreeLevel as DegreeLevel,
    degreeTitle: row.degreeTitle,
    ects: row.ects,
    years: yearsForProgram(row.degreeLevel, row.ects),
    facultyName: row.faculty?.name ?? null,
    campusName: row.campus?.name ?? null,
    specializations: row.specializations,
  }));
}

/** Programi i një studenti, për profilin dhe për rrethin akademik. */
export async function getProgramById(id: string) {
  return db.studyProgram.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      nameEn: true,
      degreeLevel: true,
      ects: true,
      university: { select: { id: true, name: true, nameEn: true, abbr: true } },
      faculty: { select: { id: true, name: true, nameEn: true, color: true } },
      campus: { select: { id: true, name: true } },
    },
  });
}

/** Sa vite zgjat programi, që viti i studimit të mos dalë jashtë kufirit. */
export function yearsForProgram(level: string, ects: number | null): number {
  if (level === "phd") return 4;
  if (level === "master") return ects && ects >= 120 ? 2 : 1;
  if (level === "integrated") return ects && ects >= 360 ? 6 : 5;
  return ects && ects >= 240 ? 4 : 3;
}
