/**
 * @përmendjet dhe #hashtag-ët në tekst.
 *
 * Një vend i vetëm për rregullat, që serveri (njoftimet) dhe ndërfaqja (lidhjet)
 * të lexojnë të njëjtat fjalë. Username-i ka formën `emri.mbiemri`: shkronja,
 * numra, pika dhe vizë e ulët, pa pikë në fund. Hashtag-u pranon shkronjat
 * shqipe (ë, ç) dhe numrat.
 */

const MENTION = /(^|[^\p{L}\p{N}_.@])@([a-z0-9](?:[a-z0-9._]{0,38}[a-z0-9])?)/giu;
const HASHTAG = /(^|[^\p{L}\p{N}_#&])#([\p{L}\p{N}_]{2,40})/gu;

/** Username-at e përmendur, pa përsëritje, me germa të vogla. */
export function extractMentions(text: string, max = 10): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(MENTION)) {
    found.add(match[2].toLowerCase());
    if (found.size >= max) break;
  }
  return [...found];
}

export function extractHashtags(text: string, max = 10): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(HASHTAG)) {
    // Numrat e thjeshtë (#1, #2024) nuk janë tema.
    if (/^\d+$/.test(match[2])) continue;
    found.add(match[2].toLowerCase());
    if (found.size >= max) break;
  }
  return [...found];
}

export type RichToken =
  | { kind: "text"; value: string }
  | { kind: "mention"; value: string; username: string }
  | { kind: "hashtag"; value: string; tag: string };

/** Teksti i ndarë në copa: teksti i thjeshtë, @përmendjet dhe #hashtag-ët, me rendin e vet. */
export function tokenize(text: string): RichToken[] {
  const marks: { start: number; end: number; token: RichToken }[] = [];
  for (const match of text.matchAll(MENTION)) {
    const start = (match.index ?? 0) + match[1].length;
    const value = `@${match[2]}`;
    marks.push({ start, end: start + value.length, token: { kind: "mention", value, username: match[2].toLowerCase() } });
  }
  for (const match of text.matchAll(HASHTAG)) {
    if (/^\d+$/.test(match[2])) continue;
    const start = (match.index ?? 0) + match[1].length;
    const value = `#${match[2]}`;
    marks.push({ start, end: start + value.length, token: { kind: "hashtag", value, tag: match[2].toLowerCase() } });
  }
  marks.sort((a, b) => a.start - b.start);

  const tokens: RichToken[] = [];
  let cursor = 0;
  for (const mark of marks) {
    if (mark.start < cursor) continue;
    if (mark.start > cursor) tokens.push({ kind: "text", value: text.slice(cursor, mark.start) });
    tokens.push(mark.token);
    cursor = mark.end;
  }
  if (cursor < text.length) tokens.push({ kind: "text", value: text.slice(cursor) });
  return tokens;
}

/** Fjala @ që po shkruhet te kursori, për sugjerimet: `null` kur s'ka asnjë. */
export function mentionAtCaret(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const match = /(^|[\s(])@([a-z0-9._]{0,30})$/i.exec(before);
  if (!match) return null;
  return { start: caret - match[2].length - 1, query: match[2] };
}
