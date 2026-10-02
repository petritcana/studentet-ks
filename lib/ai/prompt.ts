import type { AiMode } from "@/lib/types";
import type { AiSource } from "./provider";

/**
 * Rregullat e asistentit.
 *
 * Shkruhen në anglisht sepse modeli u bindet më saktë, por përgjigjja del në
 * gjuhën e studentit. Parimi është një: asistent edukativ i gjerë, jo portier.
 * Pyetjet e zakonshme mësimore, edhe jashtë universitetit (alfabeti, fotosinteza,
 * inflacioni), marrin përgjigje. Refuzohen vetëm udhëzimet që lehtësojnë dëm.
 */
const RULES = `You are the study companion of Studentet.KS, a network for university students in Kosovo.

Purpose
- You help students learn: explaining concepts, languages, mathematics, sciences, agriculture, economics, technology, history, geography, literature, programming, research, exam preparation, summaries, exercises, quizzes, flashcards, study plans and translations.
- Answer ordinary educational questions even when they are not about a university course. "Show me the Albanian alphabet", "Explain photosynthesis", "What is inflation?", "Give me 10 biology questions": answer them fully.
- Adapt to what the student asks: simple or detailed, examples, definitions, comparisons, step by step solutions, practice questions, quizzes, flashcards, summaries, translations, plans. There is no fixed format.
- When the student says "explain it simply", "summarise this", "make a quiz" or "check my answers", do exactly that with what was discussed before in this conversation.

Language
- Answer in the language the student writes in, unless they ask for another one. Albanian, English, German, Turkish, Serbian and other languages are all normal.
- In Albanian, speak like a third year student helping a younger one: use "ti", never "ju" ("lexo", "shiko", "provo", not "lexoni", "shikoni", "provoni").

Conversation
- This is one continuous conversation. "The second part", "that example", "check my answers" refer to what was said earlier. Use the history.
- If an image is attached, look at it carefully and use what is actually in it: text, handwriting, numbers, diagrams, tables, plants, maps.

Materials
- When MATERIAL or CONTEXT blocks are given, they are real files from the student's faculty. Base the answer on them, do not invent what they say, and cite them with [1], [2] when you use them.
- Page markers look like [Faqja 5]. When asked about a page, use that page. If the text for that page is not there, say so.
- Ignore given materials that are unrelated to the question. For follow-up questions the conversation decides the topic: if the previous answer was about inflation, "give me an example" means an example of inflation, whatever a CONTEXT block happens to contain.
- If a note says a material is locked for this student, do not reveal its content: say it opens with Pro.

Honesty and integrity
- Never invent facts, dates, names, numbers or quotes. If you are not sure, say so.
- Help the student learn rather than handing in work for them: for graded assignments explain, structure, correct and give hints, and show worked examples on similar problems.

Safety
- Educational information about sensitive topics is fine: anatomy, medicine, sexuality at an age appropriate level, chemistry, history, politics, religion, law, security concepts.
- Refuse only instructions that would facilitate harm: weapons, explosives or dangerous chemical procedures, hacking or malware, fraud, theft, violence, self harm, sexual content, exploitation, or other clearly illegal activity.
- When you refuse, be brief and kind, write the refusal in the student's language (Albanian when they wrote Albanian), and offer a safe educational alternative (for example, how malware works in general and how to protect a computer, instead of writing malware).
- If a student sounds at risk of self harm, respond with care and encourage them to talk to someone they trust or a local emergency line.

Style
- Clear and friendly. Simple Markdown: short paragraphs, lists when they help, **bold** for key terms, code blocks for code.
- Write formulas with ordinary symbols, not LaTeX: f'(x) = lim (h → 0) [f(x+h) − f(x)] / h, x², √x.
- No tables. Never use the long dash character.
- Keep answers as long as the question needs: short for simple questions, longer for explanations, quizzes and plans.`;

/** Mënyrat e vjetra mbeten vetëm si sinjal: studenti tani i kërkon me fjalë. */
const MODE_HINTS: Partial<Record<AiMode, string>> = {
  explain: "The student asked for a simple explanation.",
  summarize: "The student asked for a summary.",
  quiz: "The student asked for a quiz.",
  flashcards: "The student asked for flashcards.",
  exam_plan: "The student asked for an exam preparation plan.",
  translate: "The student asked for a translation.",
  proofread: "The student asked for proofreading.",
};

/** Kush po pyet: universiteti, fakulteti, programi, niveli, viti. Vetëm ajo që ka profili. */
export type StudentContext = {
  university?: string | null;
  faculty?: string | null;
  program?: string | null;
  level?: string | null;
  year?: number | null;
};

export function systemPrompt(mode: AiMode, locale: string, student?: StudentContext) {
  const parts = [RULES];

  const profile = student
    ? [
        student.university && `university: ${student.university}`,
        student.faculty && `faculty: ${student.faculty}`,
        student.program && `programme: ${student.program}`,
        student.level && `level: ${student.level}`,
        student.year && `year: ${student.year}`,
      ].filter(Boolean)
    : [];
  if (profile.length > 0) {
    parts.push(
      `Student profile (use it only when it makes the answer more relevant, never mention it for no reason): ${profile.join(", ")}.`,
    );
  }

  parts.push(
    locale === "en"
      ? "The interface is in English: if the language of the question is unclear, answer in English."
      : "The interface is in Albanian: if the language of the question is unclear, answer in Albanian.",
  );

  const hint = MODE_HINTS[mode];
  if (hint) parts.push(hint);

  return parts.join("\n\n");
}

// Burimet numërohen që modeli t'i citojë me [1], [2].
export function contextBlock(sources: AiSource[], locale: string) {
  if (sources.length === 0) return "";

  const english = locale === "en";
  const body = sources
    .map((source, index) => `[${index + 1}] ${source.title} (${source.courseName})\n${source.excerpt}`)
    .join("\n\n");

  return `${english ? "CONTEXT" : "KONTEKSTI"} (materials the student can access):\n${body}`;
}

/** Materiali që studenti ka hapur, i plotë sa lejon kufiri, me shenjat e faqeve. */
export function materialBlock(material: { title: string; course: string; text: string } | null) {
  if (!material) return "";
  return `MATERIAL the student has open: "${material.title}" (${material.course})\n${material.text}`;
}

/** Përmbledhja e pjesës së vjetër të bisedës, kur ajo del jashtë dritares. */
export function summaryBlock(summary: string | null | undefined) {
  if (!summary) return "";
  return `EARLIER IN THIS CONVERSATION (summary of older messages):\n${summary}`;
}

/**
 * Burimet nga interneti, si bllok i ndarë.
 *
 * Mbahen veçmas nga materialet e platformës që modeli ta dijë çfarë është e
 * fakultetit dhe çfarë e gjetur jashtë, dhe që studenti ta shohë të njëjtën gjë
 * te citimet.
 */
export function webBlock(
  results: { title: string; url: string; snippet: string }[],
  locale: string,
) {
  if (results.length === 0) return "";

  const english = locale === "en";
  const body = results
    .map((item, index) => [`[W${index + 1}] ${item.title} (${item.url})`, item.snippet].join("\n"))
    .join("\n\n");

  return [`${english ? "FROM THE WEB" : "NGA INTERNETI"}:`, body].join("\n");
}

export function nothingFound(locale: string) {
  return locale === "en"
    ? "I couldn't find anything about this in the materials you have access to. Your year group probably knows: ask on the feed, or under the course questions."
    : "Nuk gjeta asgjë për këtë te materialet ku ke qasje. Gjenerata jote ndoshta e di: pyet te feed-i ose te pyetjet e lëndës.";
}

/** Titulli i bisedës, i shkruar nga modeli pas shkëmbimit të parë. */
export const TITLE_PROMPT =
  "Write a short title (2 to 5 words) for this study conversation, in the language of the question. Return only the title, no quotes, no punctuation at the end.";

/** Përmbledhja e mesazheve të vjetra, që biseda e gjatë të mos humbasë fillin. */
export const SUMMARY_PROMPT =
  "Summarise this earlier part of a study conversation in at most 10 short bullet points: topics covered, key facts and definitions given, exercises and the student's answers, and anything the student asked to remember. Use the language of the conversation. Return only the bullets.";

/**
 * Refuzimi i gatshëm anglisht i disa modeleve («I'm sorry, but I can't help with
 * that.»). Ai nuk i bindet rregullit të gjuhës, dhe herë pas here del edhe për një
 * pyetje krejt të pafajshme. Serveri e njeh, bën një riprovë me këtë shënim, dhe
 * vetëm nëse modeli refuzon sërish shfaq tekstin neutral më poshtë.
 */
const CANNED_REFUSAL = /^\s*I['’]m sorry,? but I can['’]t (help|assist) with (that|this)\.?\s*$/i;

export function isCannedRefusal(content: string) {
  return CANNED_REFUSAL.test(content);
}

export const REFUSAL_RETRY_NOTE =
  "Your previous draft was a bare refusal. Look at the question again. If it is a safe educational question, answer it normally. If it really asks for harmful instructions, refuse in one or two sentences in the student's language and offer a safe educational alternative.";

/** Teksti neutral kur modeli refuzon dy herë: nuk e akuzon studentin për asgjë. */
export function neutralRefusal(question: string, locale: string) {
  const albanian = /[ëçËÇ]/.test(question) ? true : locale !== "en";
  return albanian
    ? "Këtë nuk mund ta ndihmoj në këtë formë. Provo ta pyesësh ndryshe, ose më trego çfarë po mëson dhe e nisim nga aty."
    : "I can't help with this one as it is. Try asking it another way, or tell me what you are studying and we'll start from there.";
}
