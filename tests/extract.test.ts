import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { extractPages } from "@/lib/materials/extract";

/** Një PDF i vogël me dy faqe, i shkruar me dorë. pdf.js e rindërton tabelën xref vetë. */
function tinyPdf(pages: string[]) {
  const objects: string[] = [];
  const kids = pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ");
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  objects.push(`2 0 obj << /Type /Pages /Kids [${kids}] /Count ${pages.length} >> endobj`);
  objects.push("3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");
  pages.forEach((text, index) => {
    const page = 4 + index * 2;
    const stream = `BT /F1 18 Tf 72 720 Td (${text}) Tj ET`;
    objects.push(
      `${page} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${page + 1} 0 R >> endobj`,
    );
    objects.push(`${page + 1} 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`);
  });
  const body = `%PDF-1.4\n${objects.join("\n")}\n`;
  return Buffer.from(`${body}trailer << /Root 1 0 R >>\n%%EOF`, "latin1");
}

describe("teksti i materialeve", () => {
  it("PDF lexohet faqe për faqe", async () => {
    const pages = await extractPages(tinyPdf(["Fotosinteza ndodh te kloroplastet", "Inflacioni rrit cmimet"]), "ligjerata.pdf", "application/pdf");
    expect(pages).toHaveLength(2);
    expect(pages[0]).toContain("Fotosinteza");
    expect(pages[1]).toContain("Inflacioni");
  });

  it("DOCX lexohet sipas paragrafëve", async () => {
    const xml =
      '<w:document><w:body><w:p><w:r><w:t>Kapitulli 1</w:t></w:r></w:p><w:p><w:r><w:t>Qeliza &amp; indet</w:t></w:r></w:p></w:body></w:document>';
    const docx = Buffer.from(zipSync({ "word/document.xml": strToU8(xml) }));
    const pages = await extractPages(docx, "shenimet.docx", "");
    expect(pages[0]).toContain("Kapitulli 1");
    expect(pages[0]).toContain("Qeliza & indet");
  });

  it("PPTX lexohet slajd për slajd, në rendin e duhur", async () => {
    const slide = (text: string) => strToU8(`<p:sld><a:t>${text}</a:t></p:sld>`);
    const pptx = Buffer.from(
      zipSync({
        "ppt/slides/slide10.xml": slide("Slajdi dhjetë"),
        "ppt/slides/slide2.xml": slide("Slajdi dy"),
        "ppt/slides/slide1.xml": slide("Slajdi një"),
      }),
    );
    const pages = await extractPages(pptx, "prezantimi.pptx", "");
    expect(pages).toEqual(["Slajdi një", "Slajdi dy", "Slajdi dhjetë"]);
  });

  it("një skedar që nuk lexohet nuk e rrëzon ngarkimin", async () => {
    expect(await extractPages(Buffer.from("jo pdf"), "i-prishur.pdf", "application/pdf")).toEqual([]);
  });
});
