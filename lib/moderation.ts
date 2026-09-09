import { db } from "@/lib/db";

/**
 * Filtri automatik. Nuk zëvendëson moderatorin, por e ndalon dëmin e qartë para
 * se të publikohet. Rregulli më i rreptë vlen për Zërin e kampusit: aty ndalimi
 * i emrave është absolut.
 */

export type ModerationCategory =
  | "harassment"
  | "hate"
  | "targeting"
  | "sexual"
  | "threat"
  | "spam"
  | "personal_data";

export const MODERATION_MESSAGES: Record<ModerationCategory, string> = {
  harassment: "Ky tekst përmban ngacmim. Shkruaje pa e sulmuar askënd dhe provo prapë.",
  hate: "Ky tekst përmban gjuhë urrejtjeje. Këtu nuk kalon.",
  targeting: "Ke përmendur një person me emër. Në Zërin e kampusit kjo nuk lejohet. Hiqe emrin dhe dërgoje sërish.",
  sexual: "Ky tekst ka përmbajtje seksuale. Nuk i takon këtij vendi.",
  threat: "Ky tekst lexohet si kërcënim. Nuk mund ta publikojmë.",
  spam: "Kjo duket si spam. Hiq linqet e përsëritura dhe provo prapë.",
  personal_data: "Ke shkruar të dhëna personale, si numër telefoni ose adresë. Hiqi dhe dërgoje sërish.",
};

const HATE_TERMS = [
  "shkije", "shiptar qen", "cigan", "magjup", "balija",
  "vdis ti", "vriteni", "duhet zhdukur", "racë e ndyrë",
];

const HARASSMENT_TERMS = [
  "idiot", "budalla", "kok trashe", "kokëtrashë", "je i marrë", "je e marrë",
  "hajde bre gomar", "gomar", "je zero", "s'vlen fare", "turp për ty",
];

const SEXUAL_TERMS = ["seks", "porno", "nudo", "foto intime"];

const THREAT_TERMS = ["do të gjej", "do ta gjej", "do t'i thyej", "të pret", "do ta paguash"];

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

export type ModerationVerdict = {
  allowed: boolean;
  category: ModerationCategory | null;
  message: string | null;
};

const OK: ModerationVerdict = { allowed: true, category: null, message: null };

function block(category: ModerationCategory): ModerationVerdict {
  return { allowed: false, category, message: MODERATION_MESSAGES[category] };
}

/**
 * Kontroll sinkron, pa bazë të dhënash. `knownNames` mbushet nga thirrësi kur
 * postimi është anonim, që të bllokohet targetimi me emër.
 */
export function screenText(
  text: string,
  options: { anonymous?: boolean; knownNames?: string[] } = {},
): ModerationVerdict {
  const value = normalize(text);

  if (containsAny(value, HATE_TERMS)) return block("hate");
  if (containsAny(value, THREAT_TERMS)) return block("threat");
  if (containsAny(value, HARASSMENT_TERMS)) return block("harassment");
  if (containsAny(value, SEXUAL_TERMS)) return block("sexual");

  if (PHONE_PATTERN.test(text) || ADDRESS_PATTERN.test(text)) {
    return block("personal_data");
  }

  const links = text.match(LINK_PATTERN) ?? [];
  if (links.length > 3 || /(.)\1{14,}/.test(text)) {
    return block("spam");
  }

  if (options.anonymous && options.knownNames?.length) {
    const hit = options.knownNames.find((name) => value.includes(normalize(name)));
    if (hit) return block("targeting");
  }

  return OK;
}

/**
 * Emrat e plotë të studentëve dhe të stafit, për filtrin e Zërit të kampusit.
 * Mbahet i shkurtër me qëllim: krahasohet vetëm emri plus mbiemri, jo emrat e
 * veçuar, që "Arta" si fjalë e zakonshme të mos bllokojë postime të ligjshme.
 */
export async function loadKnownNames(): Promise<string[]> {
  const [users, courses] = await Promise.all([
    db.user.findMany({ select: { name: true }, take: 5000 }),
    db.course.findMany({ select: { professor: true }, distinct: ["professor"] }),
  ]);

  const names = users
    .map((user) => user.name)
    .filter((name) => name.trim().split(/\s+/).length >= 2);

  const professors = courses
    .map((course) => course.professor.replace(/^Prof\.\s*(Dr\.|Ass\.)?\s*/i, "").trim())
    .filter((name) => name.split(/\s+/).length >= 2);

  return [...new Set([...names, ...professors])];
}

/** Kontroll i plotë, me emrat e ngarkuar vetëm kur duhen. */
export async function screen(
  text: string,
  options: { anonymous?: boolean } = {},
): Promise<ModerationVerdict> {
  const knownNames = options.anonymous ? await loadKnownNames() : undefined;
  return screenText(text, { anonymous: options.anonymous, knownNames });
}

/**
 * Niveli 2 i llogarisë: më e vjetër se 7 ditë dhe me email të verifikuar.
 * Kërkohet për të postuar në Zërin e kampusit.
 */
export function meetsLevelTwo(user: {
  createdAt: Date;
  isVerified: boolean;
}): boolean {
  const sevenDays = 7 * 24 * 3600 * 1000;
  return user.isVerified && Date.now() - user.createdAt.getTime() >= sevenDays;
}

/** Tri raportime aktivizojnë fshehje automatike deri në rishikim. */
export const AUTO_HIDE_THRESHOLD = 3;

export async function applyAutoHide(targetId: string, targetType: string) {
  const count = await db.report.count({
    where: { targetId, targetType, status: { in: ["open", "reviewing"] } },
  });
  if (count < AUTO_HIDE_THRESHOLD) return false;

  if (targetType === "post") {
    await db.post.update({ where: { id: targetId }, data: { isHidden: true } });
  } else if (targetType === "comment") {
    await db.comment.update({ where: { id: targetId }, data: { isHidden: true } });
  } else if (targetType === "material") {
    await db.material.update({
      where: { id: targetId },
      data: { isHidden: true, verificationStatus: "hidden" },
    });
  } else if (targetType === "answer") {
    await db.answer.update({ where: { id: targetId }, data: { isHidden: true } });
  }
  return true;
}
