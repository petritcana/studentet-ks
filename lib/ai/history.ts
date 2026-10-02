/**
 * Historiku i asistentit, pa bazë dhe pa sesion, që të provohet më vete.
 */

/** Sa mesazhe të fundit hyjnë në dritare, dhe sa karaktere gjithsej. */
export const HISTORY_MESSAGES = 40;
export const HISTORY_CHARS = 10_000;

export type Attachment = { id: string; extension: string; mime: string };

export function parseAttachments(raw: string | null | undefined): Attachment[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.id === "string" && typeof item.extension === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * Dritarja e historikut: nga fundi prapa, derisa mbushet kufiri.
 *
 * Mesazhi i fundit nuk pritet kurrë përgjysmë: nëse nuk nxë, ndalet aty. Kthen
 * edhe sa mesazhe mbetën jashtë, që përmbledhja të dijë çfarë mbulon.
 */
export function historyWindow<T extends { content: string }>(
  messages: T[],
  maxMessages = HISTORY_MESSAGES,
  maxChars = HISTORY_CHARS,
): { kept: T[]; dropped: number } {
  const kept: T[] = [];
  let used = 0;

  for (let index = messages.length - 1; index >= 0 && kept.length < maxMessages; index -= 1) {
    const size = messages[index].content.length;
    if (kept.length > 0 && used + size > maxChars) break;
    kept.unshift(messages[index]);
    used += size;
  }

  return { kept, dropped: messages.length - kept.length };
}

/** Titulli i parë, para se ta shkruajë modeli: fjalët e para të pyetjes, pa shenja. */
export function draftTitle(question: string) {
  const clean = question.replace(/\s+/g, " ").replace(/[?!.:,;]+$/g, "").trim();
  if (!clean) return "Bisedë e re";
  return clean.length > 48 ? `${clean.slice(0, 45).trimEnd()}…` : clean;
}
