/**
 * Kategoritë e garës.
 *
 * Emrat rrinë te katalogët e përkthimeve (`competition.cat_<id>`). Fjalët kyçe
 * lidhin kategorinë me fakultetin dhe programin e studentit, që faqja t'i
 * sugjerojë ato që i përkasin, pa ia mbyllur të tjerat.
 */
export const COMPETITION_CATEGORIES = [
  "general",
  "mathematics",
  "economics",
  "business",
  "agriculture",
  "computer_science",
  "engineering",
  "medicine",
  "languages",
  "history",
  "geography",
  "science",
  "technology",
  "literature",
  "university_life",
] as const;

export type CompetitionCategory = (typeof COMPETITION_CATEGORIES)[number];

export function isCategory(value: unknown): value is CompetitionCategory {
  return typeof value === "string" && (COMPETITION_CATEGORIES as readonly string[]).includes(value);
}

/** Emoji e vogël për kartën e kategorisë. Pa ngjyra hex: vetëm shenjë. */
export const CATEGORY_ICON: Record<CompetitionCategory, string> = {
  general: "🧠",
  mathematics: "➗",
  economics: "📈",
  business: "💼",
  agriculture: "🌾",
  computer_science: "💻",
  engineering: "⚙️",
  medicine: "🩺",
  languages: "🗣️",
  history: "🏛️",
  geography: "🗺️",
  science: "🔬",
  technology: "📡",
  literature: "📚",
  university_life: "🎓",
};

const HINTS: Record<CompetitionCategory, string[]> = {
  general: [],
  mathematics: ["matemat", "statistik", "fizik"],
  economics: ["ekonomi", "financ", "bank", "kontabil"],
  business: ["biznes", "menaxh", "marketing", "administrim"],
  agriculture: ["bujq", "agro", "veterin", "ushqim", "pyj"],
  computer_science: ["kompjuter", "informatik", "softuer", "shkenca kompjuterike"],
  engineering: ["inxhinier", "ndertim", "mekanik", "elektrik", "mekatronik", "arkitektur"],
  medicine: ["mjek", "infermier", "farmac", "stomatolog", "shendet", "fizioterap"],
  languages: ["gjuh", "filolog", "anglisht", "gjermanisht", "perkthim"],
  history: ["histori", "arkeolog"],
  geography: ["gjeografi", "gjeodez"],
  science: ["biolog", "kimi", "fizik", "shkenca natyrore"],
  technology: ["teknolog", "telekomunik", "elektronik"],
  literature: ["letersi", "filolog", "gazetari"],
  university_life: [],
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ë/g, "e")
    .replace(/ç/g, "c");
}

/** Kategoritë që i përkasin studimeve të studentit, të parat, pastaj të përgjithshmet. */
export function suggestCategories(academic: string | null | undefined): CompetitionCategory[] {
  const text = normalize(academic ?? "");
  const matched = text
    ? COMPETITION_CATEGORIES.filter((category) => HINTS[category].some((hint) => text.includes(hint)))
    : [];
  const rest: CompetitionCategory[] = ["general", "university_life", "science", "languages"];
  return [...new Set([...matched, ...rest])].slice(0, 4);
}
