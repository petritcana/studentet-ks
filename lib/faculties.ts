/**
 * Identiteti vizual i fakulteteve. Përdoret në badge, kanale, renditje dhe
 * avatarë. Çelësi ruhet në bazën e të dhënave (Faculty.color), teksti shqip
 * jeton vetëm këtu.
 */

export const FACULTY_KEYS = [
  "economics",
  "medicine",
  "law",
  "science",
  "philology",
  "arts",
] as const;

export type FacultyKey = (typeof FACULTY_KEYS)[number];

export type FacultyTheme = {
  key: FacultyKey;
  label: string;
  shortLabel: string;
  /** Klasa Tailwind të ndërtuara plotësisht, që purge-i t'i gjejë. */
  text: string;
  bg: string;
  border: string;
  dot: string;
  gradient: string;
};

export const FACULTY_THEMES: Record<FacultyKey, FacultyTheme> = {
  economics: {
    key: "economics",
    label: "Fakulteti Ekonomik",
    shortLabel: "Ekonomik",
    text: "text-faculty-economics",
    bg: "bg-faculty-economics/10",
    border: "border-faculty-economics/30",
    dot: "bg-faculty-economics",
    gradient: "from-faculty-economics/25 to-faculty-economics/5",
  },
  medicine: {
    key: "medicine",
    label: "Fakulteti i Mjekësisë",
    shortLabel: "Mjekësi",
    text: "text-faculty-medicine",
    bg: "bg-faculty-medicine/10",
    border: "border-faculty-medicine/30",
    dot: "bg-faculty-medicine",
    gradient: "from-faculty-medicine/25 to-faculty-medicine/5",
  },
  law: {
    key: "law",
    label: "Fakulteti Juridik",
    shortLabel: "Juridik",
    text: "text-faculty-law",
    bg: "bg-faculty-law/10",
    border: "border-faculty-law/30",
    dot: "bg-faculty-law",
    gradient: "from-faculty-law/25 to-faculty-law/5",
  },
  science: {
    key: "science",
    label: "Fakulteti i Shkencave Matematike-Natyrore",
    shortLabel: "FSHMN",
    text: "text-faculty-science",
    bg: "bg-faculty-science/10",
    border: "border-faculty-science/30",
    dot: "bg-faculty-science",
    gradient: "from-faculty-science/25 to-faculty-science/5",
  },
  philology: {
    key: "philology",
    label: "Fakulteti i Filologjisë",
    shortLabel: "Filologjik",
    text: "text-faculty-philology",
    bg: "bg-faculty-philology/10",
    border: "border-faculty-philology/30",
    dot: "bg-faculty-philology",
    gradient: "from-faculty-philology/25 to-faculty-philology/5",
  },
  arts: {
    key: "arts",
    label: "Fakulteti i Arteve",
    shortLabel: "Arte",
    text: "text-faculty-arts",
    bg: "bg-faculty-arts/10",
    border: "border-faculty-arts/30",
    dot: "bg-faculty-arts",
    gradient: "from-faculty-arts/25 to-faculty-arts/5",
  },
};

export function facultyTheme(key: string | null | undefined): FacultyTheme {
  if (key && key in FACULTY_THEMES) return FACULTY_THEMES[key as FacultyKey];
  return FACULTY_THEMES.economics;
}
