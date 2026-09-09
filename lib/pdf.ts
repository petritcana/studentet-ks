/**
 * Gjenerues PDF minimal, pa varësi.
 *
 * Përdoret nga shkarkimi i materialeve dhe nga CV-ja me një klikim. Fontet bazë
 * të PDF-së me kodimin WinAnsi i mbulojnë ë dhe ç, prandaj shqipja del e saktë
 * pa pasur nevojë të futet një font i jashtëm.
 */

export type PdfLine = {
  text: string;
  size?: number;
  bold?: boolean;
  gap?: number;
  color?: [number, number, number];
};

const WIDTH = 595.28; // A4
const HEIGHT = 841.89;
const MARGIN = 56;

/** WinAnsi e mbulon latinishten perëndimore; zëvendësojmë vetëm atë që s'ka. */
function toWinAnsi(text: string) {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/–/g, "-")
    .replace(/—/g, "-")
    .replace(/…/g, "...");
}

function escapePdf(text: string) {
  return toWinAnsi(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Përafrim i gjerësisë për Helvetica, mjaftueshëm i saktë për thyerjen e rreshtave. */
function wrap(text: string, size: number, maxWidth: number) {
  const perChar = size * 0.5;
  const maxChars = Math.max(12, Math.floor(maxWidth / perChar));
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

export function buildPdf(title: string, lines: PdfLine[]): Uint8Array {
  const pages: string[] = [];
  let content = "";
  let y = HEIGHT - MARGIN;

  const pushPage = () => {
    if (content.trim().length > 0) pages.push(content);
    content = "";
    y = HEIGHT - MARGIN;
  };

  for (const line of lines) {
    const size = line.size ?? 11;
    const font = line.bold ? "/F2" : "/F1";
    const color = line.color ?? [0.11, 0.1, 0.09];
    const wrapped = wrap(line.text, size, WIDTH - MARGIN * 2);

    for (const piece of wrapped) {
      if (y < MARGIN + size * 2) pushPage();
      content += `BT ${font} ${size} Tf ${color[0]} ${color[1]} ${color[2]} rg ${MARGIN} ${y.toFixed(2)} Td (${escapePdf(piece)}) Tj ET\n`;
      y -= size * 1.45;
    }
    y -= line.gap ?? 4;
  }
  pushPage();
  if (pages.length === 0) pages.push("");

  // --- montimi i objekteve ---
  const objects: string[] = [];
  const pageIds: number[] = [];
  const firstPageObject = 5;

  pages.forEach((_, index) => {
    pageIds.push(firstPageObject + index * 2);
  });

  objects.push(`<< /Type /Catalog /Pages 2 0 R >>`);
  objects.push(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  );
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
  objects.push(
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`,
  );

  pages.forEach((stream, index) => {
    const contentId = firstPageObject + index * 2 + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${WIDTH} ${HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
  });

  const header = `%PDF-1.4\n`;
  let body = "";
  const offsets: number[] = [];
  let position = header.length;

  objects.forEach((object, index) => {
    const chunk = `${index + 1} 0 obj\n${object}\nendobj\n`;
    offsets.push(position);
    body += chunk;
    position += chunk.length;
  });

  const xrefStart = position;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info << /Title (${escapePdf(title)}) >> >>\nstartxref\n${xrefStart}\n%%EOF`;

  const pdf = `${header}${body}${xref}${trailer}`;
  const bytes = new Uint8Array(pdf.length);
  for (let index = 0; index < pdf.length; index += 1) {
    bytes[index] = pdf.charCodeAt(index) & 0xff;
  }
  return bytes;
}
