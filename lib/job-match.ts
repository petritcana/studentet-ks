import { normalizeSearch } from "@/lib/search-text";

export type JobViewer = {
  facultyName: string | null;
  programName: string | null;
  city: string | null;
  year: number | null;
  level: string | null;
};

/**
 * Fjalët që lidhin një program me një fushë pune.
 *
 * Harta është e shkurtër me qëllim: mbulon fushat që ekzistojnë vërtet te
 * shpalljet, dhe kur nuk njeh asgjë, nuk shpik lidhje. Një përputhje e gabuar
 * është më keq se asnjë: studenti mëson të mos i besojë rendit.
 */
const FIELD_HINTS: Record<string, string[]> = {
  teknologji: ["kompjuterik", "informatik", "softuer", "inxhinieri elektrike", "cloud", "siguri kibernetike", "programim", "shkenca kompjuterike", "mekatronik"],
  financa: ["financ", "banka", "kontabilitet", "ekonomi"],
  ekonomi: ["ekonomi", "menaxhment", "biznes", "administrim"],
  marketing: ["marketing", "shitje", "komunikim"],
  media: ["gazetari", "media", "komunikim masiv", "produksion"],
  dizajn: ["dizajn", "arte", "grafik", "mode"],
  arkitekture: ["arkitektur", "interier", "ndertimor", "gjeodezi"],
  drejtesi: ["juridik", "drejt", "ligj"],
  shendetesi: ["mjek", "infermieri", "farmaci", "stomatologji", "fizioterapi", "shendet", "radiologji", "logopedi"],
  bujqesi: ["bujqesi", "agro", "veterinar", "ushqim", "prodhimit bimor"],
  gjuhe: ["gjuhe", "letersi", "perkthim", "filologji"],
  sport: ["sport", "edukim fizik"],
  kerkim: ["kerkim", "shkenc", "matematik", "fizik", "kimi", "biologji"],
};

/** A i përket kjo fushë pune rrugës akademike të studentit. */
export function matchesField(field: string, viewer: JobViewer): boolean {
  const key = normalizeSearch(field).replace(/\s+/g, "");
  const hints = FIELD_HINTS[key];
  if (!hints) return false;

  const academic = normalizeSearch(`${viewer.programName ?? ""} ${viewer.facultyName ?? ""}`);
  if (!academic.trim()) return false;

  return hints.some((hint) => academic.includes(hint));
}

/** Praktikat u shkojnë viteve të para; punët me orar të plotë atyre që po mbarojnë. */
export function matchesLevel(type: string, viewer: JobViewer): boolean {
  if (!viewer.year) return false;
  if (type === "internship" || type === "part_time") return viewer.year <= 2;
  if (type === "full_time") return viewer.year >= 3 || viewer.level === "master";
  return false;
}

/** Fushat e shpalljeve, siç ruhen. Admini zgjedh prej tyre, që përputhja të mos humbasë nga një gërmë. */
export const JOB_FIELDS = [
  "Teknologji",
  "Financa",
  "Ekonomi",
  "Marketing",
  "Media",
  "Dizajn",
  "Arkitekturë",
  "Drejtësi",
  "Shëndetësi",
  "Bujqësi",
  "Gjuhë",
  "Sport",
  "Kërkim",
  "Të gjitha fushat",
] as const;

export type JobAlertStudent = {
  viewer: JobViewer;
  openToWork: boolean;
  desiredRoles: string[];
};

/**
 * A i takon kjo shpallje këtij studenti si njoftim.
 *
 * Njoftimi është më i rreptë se renditja te Karriera: atje një përputhje e dobët
 * vetëm e ngre një kartë, këtu ajo ndërpret studentin. Prandaj hyn vetëm kur
 * fusha i përket programit, kur studenti e ka kërkuar vetë këtë rol, ose kur
 * shpallja është për të gjitha fushat dhe studenti ka thënë që kërkon punë.
 */
export function jobFitsStudent(
  job: { title: string; field: string },
  student: JobAlertStudent,
): boolean {
  if (matchesField(job.field, student.viewer)) return true;

  const title = normalizeSearch(`${job.title} ${job.field}`);
  const wanted = student.desiredRoles.map(normalizeSearch).filter((role) => role.length >= 3);
  if (wanted.some((role) => title.includes(role))) return true;

  const openField = !FIELD_HINTS[normalizeSearch(job.field).replace(/\s+/g, "")];
  return openField && student.openToWork;
}
