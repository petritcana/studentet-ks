/**
 * Katalogu akademik, nga ana e shfletuesit.
 *
 * Të njëjtat thirrje i përdorin zgjedhësi te cilësimet dhe magjistari i hyrjes,
 * që një ndryshim te API rri në një vend të vetëm. Asgjë nuk ngarkohet para se
 * të duhet: institucionet e para, pastaj fakultetet, pastaj programet.
 */

export type AcademicInstitution = {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  abbr: string;
  city: string;
  type: string;
};

export type AcademicOption = { id: string; name: string; nameEn?: string };

export type AcademicProgram = {
  id: string;
  name: string;
  nameEn: string;
  level: string;
  /** Shkurtesa e titullit, ashtu si e shkruan lista: BSc, BA, LLB, MSc, PhD. */
  degreeTitle: string | null;
  ects: number | null;
  /** Sa vite zgjat, që hapi i vitit të mos ofrojë një vit që nuk ekziston. */
  years: number;
  facultyName: string | null;
  campusName: string | null;
  specializations: { id: string; name: string; nameEn: string }[];
};

async function call<T>(params: Record<string, string>, key: "items" | "item" = "items"): Promise<T> {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`/api/akademia?${query}`);
  if (!response.ok) throw new Error("academic");
  const body = (await response.json()) as Record<string, unknown>;
  return body[key] as T;
}

export function fetchInstitutions(query = ""): Promise<AcademicInstitution[]> {
  return call<AcademicInstitution[]>({ hapi: "institucionet", ...(query ? { q: query } : {}) });
}

export function fetchCampuses(universityId: string): Promise<AcademicOption[]> {
  return call<AcademicOption[]>({ hapi: "kampuset", institucioni: universityId });
}

/** Fakultetet që kanë vërtet programe aktive. Te kolegjet private kthen listë bosh. */
export function fetchFaculties(universityId: string): Promise<AcademicOption[]> {
  return call<AcademicOption[]>({ hapi: "fakultetet", institucioni: universityId });
}

/** Programet, një rresht për çdo nivel: «Mekatronikë, BSc» dhe «Mekatronikë, MSc». */
export function fetchPrograms(input: {
  universityId: string;
  campusId?: string | null;
  facultyId?: string | null;
  query?: string;
}): Promise<AcademicProgram[]> {
  return call<AcademicProgram[]>({
    hapi: "programet",
    institucioni: input.universityId,
    ...(input.campusId ? { kampusi: input.campusId } : {}),
    ...(input.facultyId ? { fakulteti: input.facultyId } : {}),
    ...(input.query ? { q: input.query } : {}),
  });
}
