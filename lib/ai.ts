/**
 * Ndihmësi AI, i heshtur.
 *
 * Rregullat që nuk shkelen:
 *  - Asnjë banner "Powered by AI". AI ndihmon, nuk reklamohet.
 *  - Çdo dalje ka etiketë "gjeneruar automatikisht, verifiko" dhe link te burimi.
 *  - Përmbajtja e studentit nuk zëvendësohet kurrë me përmbajtje AI në feed.
 *
 * Kjo shtresë është abstrakte me qëllim. Pa çelës API, kthen një përgjigje të
 * ndërtuar nga vetë dokumenti, dhe UI-ja e thotë hapur se është e përafërt.
 */

export type AiSource = { label: string; href: string };

export type AiResult<T> = {
  data: T;
  /** false kur nuk ka çelës dhe përgjigja u ndërtua lokalisht. */
  generated: boolean;
  source: AiSource;
  disclaimer: string;
};

const DISCLAIMER = "Gjeneruar automatikisht. Verifiko te burimi para provimit.";

export function isAiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

type SummaryInput = {
  title: string;
  courseName: string;
  professor?: string | null;
  description?: string | null;
  pages?: number | null;
  type: string;
  href: string;
};

/** Përmbledhje në dhjetë pika. */
export async function summarize(input: SummaryInput): Promise<AiResult<string[]>> {
  if (isAiEnabled()) {
    const remote = await callModel(buildSummaryPrompt(input));
    if (remote) {
      return {
        data: remote.split("\n").map((line) => line.replace(/^[-•\d.\s]+/, "").trim()).filter(Boolean).slice(0, 10),
        generated: true,
        source: { label: input.title, href: input.href },
        disclaimer: DISCLAIMER,
      };
    }
  }

  return {
    data: localSummary(input),
    generated: false,
    source: { label: input.title, href: input.href },
    disclaimer: DISCLAIMER,
  };
}

export type Flashcard = { front: string; back: string };

export async function makeFlashcards(input: SummaryInput): Promise<AiResult<Flashcard[]>> {
  const points = (await summarize(input)).data;

  return {
    data: points.slice(0, 6).map((point, index) => ({
      front: `Pika ${index + 1}: çfarë duhet mbajtur mend?`,
      back: point,
    })),
    generated: isAiEnabled(),
    source: { label: input.title, href: input.href },
    disclaimer: DISCLAIMER,
  };
}

export type QuizQuestion = { question: string; options: string[]; correctIndex: number };

export async function makeQuiz(input: SummaryInput): Promise<AiResult<QuizQuestion[]>> {
  const points = (await summarize(input)).data;

  return {
    data: points.slice(0, 4).map((point) => ({
      question: `Cila nga këto i përket materialit «${input.title}»?`,
      options: [
        point,
        `Kjo pikë nuk përmendet te ${input.courseName}.`,
        "Kjo i takon një lënde tjetër.",
        "Nuk ka të bëjë me këtë kapitull.",
      ],
      correctIndex: 0,
    })).map((item, index) => ({ ...item, question: `${index + 1}. ${item.question}` })),
    generated: isAiEnabled(),
    source: { label: input.title, href: input.href },
    disclaimer: DISCLAIMER,
  };
}

/** Shpjegim i një paragrafi të vështirë me fjalë të thjeshta. */
export async function explainSimply(
  paragraph: string,
  context: { courseName: string; href: string; title: string },
): Promise<AiResult<string>> {
  if (isAiEnabled()) {
    const remote = await callModel(
      `Shpjego këtë paragraf nga lënda ${context.courseName} me fjalë të thjeshta, në shqip, në tri fjali:\n\n${paragraph}`,
    );
    if (remote) {
      return {
        data: remote.trim(),
        generated: true,
        source: { label: context.title, href: context.href },
        disclaimer: DISCLAIMER,
      };
    }
  }

  const sentences = paragraph
    .split(/[.!?]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    data:
      sentences.length === 0
        ? "S'ka mjaftueshëm tekst për ta thjeshtuar."
        : `Me fjalë të thjeshta: ${sentences[0].toLowerCase()}. ` +
          (sentences[1] ? `Pastaj, ${sentences[1].toLowerCase()}. ` : "") +
          `Kjo lidhet me ${context.courseName}.`,
    generated: false,
    source: { label: context.title, href: context.href },
    disclaimer: DISCLAIMER,
  };
}

/**
 * Kërkim semantik i thjeshtuar: pa çelës, bie te përputhja e fjalëve, që
 * veçoria të mos zhduket kur mungon modeli.
 */
export function semanticRank<T extends { title: string; description?: string | null }>(
  items: T[],
  query: string,
): T[] {
  const terms = query
    .toLocaleLowerCase("sq")
    .split(/\s+/)
    .filter((term) => term.length > 2);
  if (terms.length === 0) return items;

  return [...items]
    .map((item) => {
      const haystack = `${item.title} ${item.description ?? ""}`.toLocaleLowerCase("sq");
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}

// --- brenda ----------------------------------------------------------------

function buildSummaryPrompt(input: SummaryInput) {
  return [
    "Je ndihmës studimi për studentë në Kosovë. Shkruaj vetëm shqip, me diakritika.",
    "Jep dhjetë pika të shkurtra, secila në një rresht, pa numërim.",
    `Materiali: ${input.title}`,
    `Lënda: ${input.courseName}`,
    input.professor ? `Profesori: ${input.professor}` : "",
    input.description ? `Shënim i ngarkuesit: ${input.description}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function localSummary(input: SummaryInput): string[] {
  const base = [
    `Materiali mbulon lëndën ${input.courseName}.`,
    input.professor ? `Ligjëruesi i referuar është ${input.professor}.` : null,
    input.pages ? `Ka ${input.pages} faqe, prandaj ndaje leximin në dy ose tri seanca.` : null,
    input.description ? `Ngarkuesi shënon: ${input.description}` : null,
    "Nis nga përmbajtja dhe shëno kapitujt që nuk i njeh fare.",
    "Krahaso me shënimet e tua të ligjëratës para se ta besosh plotësisht.",
    "Nëse gjen mospërputhje me skriptën zyrtare, shkruaj në komente.",
    "Provimet e kaluara të së njëjtës lëndë tregojnë çfarë pyetet vërtet.",
    "Bëj një skemë njëfaqëshe pasi ta mbarosh, të mbetet në kokë.",
    "Nëse ngec në një pjesë, pyete lëndën. Dikush që e ka kaluar do të përgjigjet.",
  ].filter(Boolean) as string[];

  return base.slice(0, 10);
}

async function callModel(prompt: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as {
      content?: { type: string; text?: string }[];
    };
    return data.content?.find((block) => block.type === "text")?.text ?? null;
  } catch {
    return null;
  }
}
