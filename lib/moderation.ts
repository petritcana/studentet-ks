import { db } from "@/lib/db";
import { onContentHidden } from "@/lib/competition/contributions";

/**
 * Filtri automatik. Nuk zëvendëson moderatorin, por e ndalon dëmin e qartë para
 * se të publikohet. Rregulli më i rreptë vlen për Zërin e kampusit: aty ndalimi
 * i emrave është absolut.
 */

export type GuardCategory =
  | "harassment"
  | "hate"
  | "targeting"
  | "sexual"
  | "threat"
  | "spam"
  | "personal_data";

const HATE_TERMS = ["shkije", "cigan", "magjup", "balija", "vdis ti", "vriteni", "duhet zhdukur", "race e ndyre"];
const HARASSMENT_TERMS = ["idiot", "budalla", "koketrashe", "je i marre", "je e marre", "gomar", "turp per ty"];
const SEXUAL_TERMS = ["porno", "nudo", "foto intime"];
const THREAT_TERMS = ["do te gjej", "do ta gjej", "do t'i thyej", "do ta paguash"];

const PHONE_PATTERN = /(?:\+383|0)\s?4[3-9](?:[\s.-]?\d){6}/;
const ADDRESS_PATTERN = /\b(rr\.|rruga)\s+[A-ZËÇ][\p{L}]+/iu;
const LINK_PATTERN = /https?:\/\/[^\s]+/g;

function normalize(text: string) {
  return text
    .toLocaleLowerCase("sq")
    .replace(/ë/g, "e")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ");
}

function containsAny(haystack: string, needles: string[]) {
  return needles.some((needle) => haystack.includes(normalize(needle)));
}

export type GuardVerdict = { allowed: boolean; category: GuardCategory | null };

const OK: GuardVerdict = { allowed: true, category: null };

export function screenText(
  text: string,
  options: { anonymous?: boolean; knownNames?: string[] } = {},
): GuardVerdict {
  const value = normalize(text);

  if (containsAny(value, HATE_TERMS)) return { allowed: false, category: "hate" };
  if (containsAny(value, THREAT_TERMS)) return { allowed: false, category: "threat" };
  if (containsAny(value, HARASSMENT_TERMS)) return { allowed: false, category: "harassment" };
  if (containsAny(value, SEXUAL_TERMS)) return { allowed: false, category: "sexual" };

  if (PHONE_PATTERN.test(text) || ADDRESS_PATTERN.test(text)) {
    return { allowed: false, category: "personal_data" };
  }

  const links = text.match(LINK_PATTERN) ?? [];
  if (links.length > 3 || /(.)\1{14,}/.test(text)) return { allowed: false, category: "spam" };

  if (options.anonymous && options.knownNames?.length) {
    const hit = options.knownNames.find((name) => value.includes(normalize(name)));
    if (hit) return { allowed: false, category: "targeting" };
  }

  return OK;
}

/**
 * Emrat e plotë të studentëve dhe të stafit, për Zërin e kampusit. Krahasohet
 * vetëm emri plus mbiemri, që një emër i zakonshëm si «Arta» të mos bllokojë
 * postime të ligjshme.
 */
export async function loadKnownNames(): Promise<string[]> {
  const [users, courses] = await Promise.all([
    db.user.findMany({ select: { name: true }, take: 5000 }),
    db.course.findMany({ select: { professor: true }, distinct: ["professor"] }),
  ]);

  const names = users.map((user) => user.name).filter((name) => name.trim().split(/\s+/).length >= 2);
  const professors = courses
    .map((course) => course.professor.replace(/^Prof\.\s*(Dr\.|Ass\.)?\s*/i, "").trim())
    .filter((name) => name.split(/\s+/).length >= 2);

  return [...new Set([...names, ...professors])];
}

export async function screen(
  text: string,
  options: { anonymous?: boolean } = {},
): Promise<GuardVerdict> {
  const knownNames = options.anonymous ? await loadKnownNames() : undefined;
  return screenText(text, { anonymous: options.anonymous, knownNames });
}

export function pseudonymFor(userId: string, threadId: string): number {
  const seed = `${threadId}:${userId}`;
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  // 1 deri 99: numra që lexohen si emra, jo si identifikues.
  return (Math.abs(hash) % 99) + 1;
}

/** Niveli 2: më e vjetër se 7 ditë dhe me email të verifikuar. */
export function meetsLevelTwo(user: { createdAt: Date; isVerified: boolean }): boolean {
  return user.isVerified && Date.now() - user.createdAt.getTime() >= 7 * 86_400_000;
}

export const AUTO_HIDE_THRESHOLD = 3;

export async function applyAutoHide(targetId: string, targetType: string) {
  const count = await db.report.count({
    where: { targetId, targetType, status: { in: ["open", "reviewing"] } },
  });
  if (count < AUTO_HIDE_THRESHOLD) return false;

  if (targetType === "post") await db.post.update({ where: { id: targetId }, data: { isHidden: true } });
  else if (targetType === "comment") await db.comment.update({ where: { id: targetId }, data: { isHidden: true } });
  else if (targetType === "material") {
    await db.material.update({
      where: { id: targetId },
      data: { isHidden: true, verificationStatus: "hidden" },
    });
  } else if (targetType === "answer") {
    await db.answer.update({ where: { id: targetId }, data: { isHidden: true } });
  }

  await onContentHidden(targetType, targetId);
  return true;
}
