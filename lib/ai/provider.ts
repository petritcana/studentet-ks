import "server-only";

import type { AiMode } from "@/lib/types";
import type { AiSource } from "./types";
import { stem, tokenize } from "./embeddings";
import { nothingFound, type StudentContext } from "./prompt";

export type { AiSource };

/** Një burim nga interneti, i dhënë modelit dhe i cituar te përgjigjja. */
export type WebSource = { title: string; url: string; snippet: string };

export type AiAnswer = {
  content: string;
  sources: AiSource[];
  tokensIn: number;
  tokensOut: number;
};

/** Një imazh i dhënë modelit, si bajta base64 me llojin e vet. */
export type AiImage = { mime: string; data: string };

/** Një radhë e bisedës. Imazhet mbahen vetëm te radhët e fundit, që kërkesa të mos rëndohet. */
export type AiTurn = { role: string; content: string; images?: AiImage[] };

export type AiRequest = {
  mode: AiMode;
  question: string;
  sources: AiSource[];
  locale: string;
  history: AiTurn[];
  /** Burime nga interneti, vetëm me Pro dhe vetëm kur ofruesi ekziston. */
  web?: WebSource[];
  /** Imazhet e pyetjes së tanishme. */
  images?: AiImage[];
  /** Konteksti akademik i studentit, nga profili. */
  student?: StudentContext;
  /** Materiali që studenti ka hapur, kur e lejon rrethi i qasjes. */
  material?: { title: string; course: string; text: string } | null;
  /** Përmbledhja e pjesës së vjetër të bisedës. */
  summary?: string | null;
  /** Shënim shtesë për modelin, p.sh. te riprova pas një refuzimi të gatshëm. */
  note?: string;
};

export interface AiProvider {
  readonly name: string;
  isAvailable(): boolean;
  answer(request: AiRequest): Promise<AiAnswer>;
}

// Përdoret kur nuk ka çelës modeli. Nuk gjeneron tekst: zgjedh fjalitë e materialit
// që i përgjigjen më mirë pyetjes, që demoja të ketë diçka të vërtetë për të treguar.
export class MockAiProvider implements AiProvider {
  readonly name = "mock";

  isAvailable() {
    return true;
  }

  async answer(request: AiRequest): Promise<AiAnswer> {
    const english = request.locale === "en";
    const empty = { content: nothingFound(request.locale), tokensIn: request.question.length, tokensOut: 0 };

    if (request.sources.length === 0) return { ...empty, sources: [] };

    // Vetëm nga burimet që shfaqen si karta, që çdo fjali të mund të verifikohet.
    const cited = request.sources.slice(0, 3);
    const sentences = pickRelevantSentences(request.question, cited, 3);

    if (sentences.length === 0) return { ...empty, sources: cited };

    const lead = english ? "From the materials you have access to:" : "Nga materialet ku ke qasje:";

    const closing =
      request.mode === "quiz" || request.mode === "flashcards"
        ? english
          ? "Cover the text and try to say it back before you look again."
          : "Mbuloje tekstin dhe provo ta thuash me fjalët e tua para se ta shohësh sërish."
        : english
          ? "This is taken straight from the material, so check the source for the full context."
          : "Kjo është marrë drejt nga materiali, prandaj shiko burimin për kontekstin e plotë.";

    const content = `${lead}\n\n${sentences.join(" ")}\n\n${closing}`;

    return { content, sources: cited, tokensIn: request.question.length, tokensOut: content.length };
  }
}

// Fjalët e rralla të pyetjes peshojnë më shumë: "funksionet e mëlçisë" duhet të gjejë
// fjalinë për mëlçinë, jo çdo fjali që përmend "funksion".
function pickRelevantSentences(question: string, sources: AiSource[], limit: number): string[] {
  const sentences: string[] = [];

  for (const source of sources) {
    for (const raw of source.excerpt.split(/(?<=[.!?])\s+/)) {
      const sentence = raw.trim();
      if (sentence.length >= 25) sentences.push(sentence);
    }
  }
  if (sentences.length === 0) return [];

  const asked = new Set(tokenize(question).map(stem));
  const bags = sentences.map((sentence) => new Set(tokenize(sentence).map(stem)));

  const spread = new Map<string, number>();
  for (const word of asked) {
    spread.set(word, bags.filter((bag) => bag.has(word)).length);
  }

  const scored = sentences.map((sentence, index) => {
    let score = 0;
    for (const word of asked) {
      const seen = spread.get(word) ?? 0;
      if (seen > 0 && bags[index].has(word)) score += 1 / seen;
    }
    return { sentence, score };
  });

  const matched = scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
  const chosen = matched.length > 0 ? matched : scored;

  // Materialet e së njëjtës lëndë shpesh kanë të njëjtën fjali.
  const unique = [...new Set(chosen.map((item) => item.sentence))];
  return unique.slice(0, limit);
}
