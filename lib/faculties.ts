/** Identiteti vizual i fakulteteve. */

export const FACULTY_CODES = [
  "economics",
  "medicine",
  "law",
  "science",
  "philology",
  "arts",
  "electrical",
  "architecture",
  "agriculture",
  "education",
  "philosophy",
  "mechanical",
  "sport",
  "mining",
] as const;

export type FacultyCode = (typeof FACULTY_CODES)[number];

export function isFacultyCode(value: unknown): value is FacultyCode {
  return typeof value === "string" && (FACULTY_CODES as readonly string[]).includes(value);
}

export function facultyCode(value: unknown): FacultyCode {
  return isFacultyCode(value) ? value : "economics";
}

/** Stili inline që i jep komponentit ngjyrën e fakultetit të duhur. */
export function facultyStyle(code: unknown): React.CSSProperties {
  const key = facultyCode(code);
  return {
    ["--faculty-fill" as string]: `var(--f-${key})`,
    ["--faculty-text" as string]: `var(--f-${key}-text)`,
  };
}

export function facultyVars(code: FacultyCode) {
  return { fill: `--f-${code}`, text: `--f-${code}-text` };
}
