import type { FacultyCode } from "@/lib/faculties";

/**
 * Të dhëna demo vetëm për faqen e sistemit të dizajnit. Emrat janë kosovarë dhe
 * gjendjet mbulojnë çdo kombinim që duhet parë: i paverifikuar, i verifikuar,
 * Pro me pagesë, Pro nga kontributi.
 */
export type DemoPerson = {
  name: string;
  username: string;
  facultyCode: FacultyCode;
  universityAbbr: string;
  year: number;
  isVerified: boolean;
  isPro: boolean;
};

export const DEMO_PEOPLE: DemoPerson[] = [
  {
    name: "Erza Krasniqi",
    username: "erza.krasniqi",
    facultyCode: "medicine",
    universityAbbr: "UP",
    year: 3,
    isVerified: true,
    isPro: false,
  },
  {
    name: "Arian Bytyqi",
    username: "arian.bytyqi",
    facultyCode: "electrical",
    universityAbbr: "UP",
    year: 1,
    isVerified: false,
    isPro: false,
  },
  {
    name: "Blerim Gashi",
    username: "blerim.gashi",
    facultyCode: "economics",
    universityAbbr: "UP",
    year: 1,
    isVerified: true,
    isPro: true,
  },
  {
    name: "Dea Morina",
    username: "dea.morina",
    facultyCode: "arts",
    universityAbbr: "UP",
    year: 2,
    isVerified: true,
    isPro: true,
  },
  {
    name: "Endrit Rexhepi",
    username: "endrit.rexhepi",
    facultyCode: "electrical",
    universityAbbr: "UP",
    year: 3,
    isVerified: true,
    isPro: true,
  },
  {
    name: "Rina Ahmeti",
    username: "rina.ahmeti",
    facultyCode: "science",
    universityAbbr: "UP",
    year: 2,
    isVerified: true,
    isPro: false,
  },
];

/** Tokenat që shfaqen te seksioni i ngjyrave, të grupuar ashtu si mendohen. */
export const COLOR_GROUPS = [
  {
    titleKey: "brand",
    tokens: [
      { name: "--brand-500", noteKey: "brand500" },
      { name: "--brand-600", noteKey: "brand600" },
      { name: "--brand-50", noteKey: "brand50" },
      { name: "--accent-500", noteKey: "accent500" },
      { name: "--accent-50", noteKey: null },
    ],
  },
  {
    titleKey: "surfaces",
    tokens: [
      { name: "--bg", noteKey: "bg" },
      { name: "--surface", noteKey: "surface" },
      { name: "--surface-2", noteKey: "surface2" },
      { name: "--border", noteKey: "border" },
    ],
  },
  {
    titleKey: "text",
    tokens: [
      { name: "--text", noteKey: null },
      { name: "--text-muted", noteKey: "textMuted" },
    ],
  },
  {
    titleKey: "semantic",
    tokens: [
      { name: "--success", noteKey: "fill" },
      { name: "--success-text", noteKey: "type" },
      { name: "--warning", noteKey: "fill" },
      { name: "--warning-text", noteKey: "type" },
      { name: "--danger", noteKey: "fill" },
      { name: "--danger-text", noteKey: "type" },
    ],
  },
] as const;

/** Çiftet kritike të kontrastit, të llogaritura nga tema aktive. */
export const CONTRAST_PAIRS = [
  { fg: "--text", bg: "--bg", labelKey: "textOnBg" },
  { fg: "--text", bg: "--surface", labelKey: "textOnSurface" },
  { fg: "--text-muted", bg: "--bg", labelKey: "mutedOnBg" },
  { fg: "--text-muted", bg: "--surface", labelKey: "mutedOnSurface" },
  { fg: "--brand-500", bg: "--bg", labelKey: "brandOnBg" },
  { fg: "--brand-contrast", bg: "--brand-500", labelKey: "onBrand" },
  { fg: "--danger-text", bg: "--bg", labelKey: "dangerOnBg" },
  { fg: "--success-text", bg: "--surface", labelKey: "successOnSurface" },
  { fg: "--warning-text", bg: "--surface", labelKey: "warningOnSurface" },
  { fg: "--accent-text", bg: "--bg", labelKey: "accentOnBg" },
] as const;

export const INTEREST_KEYS = [
  "programming",
  "design",
  "music",
  "sport",
  "entrepreneurship",
  "volunteering",
  "languages",
  "photography",
  "gaming",
  "literature",
  "activism",
] as const;

export const ACCESS_CIRCLES = [
  { circle: 1, key: "ownFaculty", free: true },
  { circle: 2, key: "otherFaculties", free: false },
  { circle: 3, key: "otherUniversities", free: false },
] as const;

export const POST_SCOPES = [
  { key: "faculty", free: true },
  { key: "university", free: false },
  { key: "national", free: false },
  { key: "followers", free: true },
] as const;
