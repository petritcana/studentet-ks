import "server-only";

import { unzipSync } from "fflate";
import { db } from "@/lib/db";
import { getAssistant } from "@/lib/ai/models";
import { chunkText, embed, serializeVector } from "@/lib/ai/embeddings";

/**
 * Teksti i një materiali, që asistenti ta lexojë vërtet.
 *
 * Deri tani ngarkimi ruante vetëm titullin dhe madhësinë, prandaj «shpjegoje këtë
 * material» merrte vetëm titullin. Tani teksti nxirret në çastin e ngarkimit:
 *
 *   PDF    faqe për faqe, me `unpdf`
 *   DOCX   paragrafët nga `word/document.xml`
 *   PPTX   slajd për slajd, nga `ppt/slides/slideN.xml`
 *   foto   transkriptohet nga modeli që sheh (shënime me dorë, faqe libri)
 *
 * Çdo faqe dhe çdo slajd mbahet me shenjën `[Faqja N]`, që pyetja «shpjego faqen 5»
 * të gjejë faqen e duhur. DOC dhe PPT e vjetër nuk lexohen: materiali mbetet me
 * titullin dhe përshkrimin.
 */

/** Kufijtë: një libër i tërë nuk hyn te asistenti, dhe nuk duhet të bllokojë ngarkimin. */
const MAX_PAGES = 300;
const MAX_CHARS = 250_000;
const MAX_CHUNKS = 400;

function decodeXml(text: string) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&");
}

async function fromPdf(bytes: Buffer): Promise<string[]> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: false });
  return (Array.isArray(text) ? text : [text]).slice(0, MAX_PAGES);
}

function fromDocx(bytes: Buffer): string[] {
  const files = unzipSync(new Uint8Array(bytes), { filter: (file) => file.name === "word/document.xml" });
  const xml = files["word/document.xml"];
  if (!xml) return [];
  const paragraphs = new TextDecoder()
    .decode(xml)
    .split(/<\/w:p>/)
    .map((part) => decodeXml([...part.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((match) => match[1]).join("")))
    .filter((paragraph) => paragraph.trim());
  // DOCX nuk ka faqe të fiksuara: e tëra është një dokument.
  return [paragraphs.join("\n")];
}

function fromPptx(bytes: Buffer): string[] {
  const files = unzipSync(new Uint8Array(bytes), {
    filter: (file) => /^ppt\/slides\/slide\d+\.xml$/.test(file.name),
  });
  return Object.keys(files)
    .sort((a, b) => Number(/(\d+)\.xml$/.exec(a)?.[1]) - Number(/(\d+)\.xml$/.exec(b)?.[1]))
    .slice(0, MAX_PAGES)
    .map((name) =>
      decodeXml(
        [...new TextDecoder().decode(files[name]).matchAll(/<a:t>([^<]*)<\/a:t>/g)]
          .map((match) => match[1])
          .join(" "),
      ),
    );
}

async function fromImage(bytes: Buffer, mime: string): Promise<string[]> {
  const live = getAssistant().live;
  if (!live) return [];
  const text = await live.transcribe({ mime, data: bytes.toString("base64") });
  return text ? [text] : [];
}

/** Faqet e tekstit, ose listë bosh kur skedari nuk lexohet. Nuk hedh kurrë gabim. */
export async function extractPages(bytes: Buffer, fileName: string, mime: string): Promise<string[]> {
  const name = fileName.toLowerCase();
  try {
    if (bytes.subarray(0, 4).toString("latin1") === "%PDF") return await fromPdf(bytes);
    if (name.endsWith(".docx")) return fromDocx(bytes);
    if (name.endsWith(".pptx")) return fromPptx(bytes);
    if (mime.startsWith("image/") || /\.(png|jpe?g|webp)$/.test(name)) {
      return await fromImage(bytes, mime.startsWith("image/") ? mime : "image/jpeg");
    }
  } catch (error) {
    console.warn("[materiale] teksti nuk u nxorr:", error instanceof Error ? error.message : error);
  }
  return [];
}

/**
 * Copëzat e materialit, me faqen në krye të secilës, dhe embedding-u i tyre.
 *
 * Copëza e parë mban titullin dhe përshkrimin, që materiali të gjendet edhe kur
 * skedari nuk lexohet. Copëzat e vjetra fshihen para se të shkruhen të rejat.
 */
export async function indexMaterial(materialId: string, header: string, pages: string[]) {
  const chunks: string[] = [header];
  let total = 0;

  for (const [index, page] of pages.entries()) {
    const clean = page.replace(/\s+/g, " ").trim();
    if (!clean) continue;
    for (const piece of chunkText(clean)) {
      if (total + piece.length > MAX_CHARS || chunks.length >= MAX_CHUNKS) break;
      chunks.push(pages.length > 1 ? `[Faqja ${index + 1}] ${piece}` : piece);
      total += piece.length;
    }
  }

  await db.materialEmbedding.deleteMany({ where: { materialId } });
  await db.materialEmbedding.createMany({
    data: chunks.map((content, chunk) => ({
      materialId,
      chunk,
      content,
      vector: serializeVector(embed(content)),
    })),
  });

  return { chunks: chunks.length, pages: pages.length };
}
