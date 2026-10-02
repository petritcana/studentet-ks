import { describe, expect, it } from "vitest";
import { cleanMath, parseBlocks } from "@/components/assistant/answer-text";

describe("përgjigja e asistentit", () => {
  it("LaTeX-i bëhet tekst i lexueshëm", () => {
    expect(cleanMath(String.raw`\(f'(x)=\lim_{h\to 0}\frac{f(x+h)-f(x)}{h}\)`)).toBe(
      "f'(x)=lim (h→ 0) (f(x+h)-f(x))/h",
    );
    expect(cleanMath(String.raw`\frac{(3+h)^{2}-3^{2}}{h}`)).toBe("((3+h)²-3²)/h");
    expect(cleanMath(String.raw`$x \le 2$`)).toBe("x ≤ 2");
  });

  it("teksti pa LaTeX nuk preket, as kllapat e kodit", () => {
    expect(cleanMath("Përdor `if (x) { return; }` këtu.")).toBe("Përdor `if (x) { return; }` këtu.");
  });

  it("ndan titujt, listat dhe kodin", () => {
    const blocks = parseBlocks("## Hapat\n1. Lexo\n2. Shkruaj\n\n```js\nconst a = {};\n```\nFund.");
    expect(blocks.map((block) => block.kind)).toEqual(["heading", "list", "code", "paragraph"]);
    expect(blocks[1]).toMatchObject({ ordered: true, items: ["Lexo", "Shkruaj"] });
    expect(blocks[2]).toMatchObject({ text: "const a = {};" });
  });
});
