import * as React from "react";

/**
 * Përgjigja e asistentit, e lexueshme.
 *
 * Modelet shkruajnë me Markdown: tituj, lista, theksime, kod. Si tekst i thjeshtë
 * studenti do të shihte yje dhe thurje. Këtu mbulohet vetëm ajo që përdorin
 * vërtet në një përgjigje studimi, dhe gjithçka ndërtohet si element React, kurrë
 * si HTML i papërpunuar: asgjë që vjen nga modeli nuk ekzekutohet dot.
 *
 * Formulat LaTeX kthehen në shenja të zakonshme, sepse prompti kërkon tekst të
 * thjeshtë por modeli nuk bindet gjithmonë.
 */
export function AnswerText({ text }: { text: string }) {
  const blocks = React.useMemo(() => parseBlocks(text).map(tidy), [text]);

  return (
    <div className="flex flex-col gap-2 text-sm leading-relaxed">
      {blocks.map((block, index) => {
        if (block.kind === "code") {
          return (
            <pre
              key={index}
              className="tabular overflow-x-auto scrollbar-thin rounded-md bg-surface px-2.5 py-2 text-xs"
            >
              <code>{block.text}</code>
            </pre>
          );
        }
        if (block.kind === "heading") {
          return (
            <p key={index} className="pt-1 font-semibold text-text">
              {inline(block.text)}
            </p>
          );
        }
        if (block.kind === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List
              key={index}
              start={block.ordered && block.start !== 1 ? block.start : undefined}
              className={`flex flex-col gap-1 pl-5 ${block.ordered ? "list-decimal" : "list-disc"} marker:text-text-muted`}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{inline(item)}</li>
              ))}
            </List>
          );
        }
        return (
          <p key={index} className="whitespace-pre-wrap">
            {inline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "code"; text: string }
  | { kind: "list"; ordered: boolean; start: number; items: string[] };

export function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length > 0) blocks.push({ kind: "paragraph", text: paragraph.join("\n") });
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trimStart().startsWith("```")) {
      flush();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trimStart().startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      blocks.push({ kind: "code", text: code.join("\n") });
      continue;
    }

    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: "heading", text: heading[1] });
      continue;
    }

    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flush();
      const ordered = Boolean(numbered);
      const last = blocks[blocks.length - 1];
      const item = (bullet ?? numbered)![1];
      if (last?.kind === "list" && last.ordered === ordered) last.items.push(item);
      // Lista nis me numrin që shkroi modeli: «4. …» mbetet 4, jo 1.
      else blocks.push({ kind: "list", ordered, start: numbered ? Number(/\d+/.exec(line)![0]) : 1, items: [item] });
      continue;
    }

    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flush();
      continue;
    }

    if (line.trim() === "") {
      flush();
      continue;
    }

    // Tabelat e Markdown-it dalin si rreshta të thjeshtë, pa vijat ndarëse.
    if (/^\s*\|?[\s:-]+\|[\s|:-]*$/.test(line)) continue;
    paragraph.push(line.includes("|") ? line.replace(/^\s*\||\|\s*$/g, "").split("|").map((cell) => cell.trim()).join(" · ") : line);
  }

  flush();
  return blocks;
}

/** Theksimet brenda rreshtit: **i trashë**, *i pjerrët*, `kod`. */
function inline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**") || token.startsWith("__")) {
      parts.push(
        <strong key={key++} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      parts.push(
        <code key={key++} className="tabular rounded bg-surface px-1 text-[0.8125rem]">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

const SYMBOLS: Record<string, string> = {
  to: "→",
  rightarrow: "→",
  Rightarrow: "⇒",
  infty: "∞",
  cdot: "·",
  times: "×",
  div: "÷",
  le: "≤",
  leq: "≤",
  ge: "≥",
  geq: "≥",
  ne: "≠",
  neq: "≠",
  approx: "≈",
  pm: "±",
  sum: "Σ",
  int: "∫",
  partial: "∂",
  Delta: "Δ",
  delta: "δ",
  epsilon: "ε",
  varepsilon: "ε",
  rho: "ρ",
  phi: "φ",
  omega: "ω",
  Omega: "Ω",
  prod: "Π",
  forall: "∀",
  exists: "∃",
  cup: "∪",
  cap: "∩",
  subset: "⊂",
  notin: "∉",
  circ: "°",
  ldots: "…",
  dots: "…",
  cdots: "⋯",
  alpha: "α",
  beta: "β",
  gamma: "γ",
  lambda: "λ",
  mu: "μ",
  pi: "π",
  sigma: "σ",
  theta: "θ",
  in: "∈",
  sqrt: "√",
  lim: "lim",
  sin: "sin",
  cos: "cos",
  tan: "tan",
  ln: "ln",
  log: "log",
};

/** Kodi mbetet i paprekur: aty kllapat dhe vijat e pjerrëta kanë kuptim. */
function tidy(block: Block): Block {
  if (block.kind === "code") return block;
  // Modelet fusin `<br>` brenda tabelave. Nuk shfaqet si HTML: bëhet rresht i ri.
  // Rreshtat që mbajtën vetëm kllapat e një formule mbeten bosh pas pastrimit: hiqen.
  const clean = (value: string) =>
    cleanMath(value.replace(/<br\s*\/?>/gi, "\n"))
      .replace(/\n[ \t]*(?=\n)/g, "")
      .trim();
  if (block.kind === "list") return { ...block, items: block.items.map(clean) };
  return { ...block, text: clean(block.text) };
}

/** LaTeX-i bëhet tekst i lexueshëm: \frac{a}{b} del a/b, \to del →. */
export function cleanMath(text: string): string {
  // Pa asnjë shenjë LaTeX teksti nuk preket, që `{}` e kodit brenda rreshtit të mbeten.
  if (!/\\[A-Za-z([]|\$/.test(text)) return text;

  let out = text
    .replace(/\\\[|\\\]|\\\(|\\\)|\$\$/g, "")
    .replace(/\$([^$\n]+)\$/g, "$1")
    // Kufiri lexohet si «lim (h → 0)», jo «lim_h→0».
    .replace(/\\lim_\{([^{}]*)\}/g, (_, under: string) => `lim (${under}) `)
    // Fuqitë dhe indekset para thyesave, që kllapat e tyre të mos e bllokojnë thyesën.
    .replace(/\^\{([^{}]*)\}/g, (_, power: string) => superscript(power))
    .replace(/\^([0-9n])/g, (_, power: string) => superscript(power))
    .replace(/_\{([^{}]*)\}/g, "_$1");

  // Thyesat, edhe të futura njëra brenda tjetrës.
  for (let round = 0; round < 3; round += 1) {
    out = out.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, (_, top, bottom) =>
      `${wrap(top)}/${wrap(bottom)}`,
    );
  }

  return out
    .replace(/\\sqrt\{([^{}]*)\}/g, "√($1)")
    .replace(/\\(?:text|mathrm|mathbf|operatorname)\{([^{}]*)\}/g, "$1")
    .replace(/\\left|\\right|\\,|\\;|\\!|\\qquad|\\quad/g, " ")
    .replace(/\\([A-Za-z]+)/g, (whole, name: string) => SYMBOLS[name] ?? whole)
    .replace(/[{}]/g, "")
    .replace(/[ \t]{2,}/g, " ");
}

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  n: "ⁿ", i: "ⁱ", "+": "⁺", "-": "⁻", "(": "⁽", ")": "⁾",
};

/** x^{2} del x², kurse një fuqi që s'ka shenjë të vogël mbetet x^(a+b). */
function superscript(power: string) {
  const trimmed = power.trim();
  const chars = [...trimmed];
  return chars.length > 0 && chars.every((char) => char in SUPERSCRIPT)
    ? chars.map((char) => SUPERSCRIPT[char]).join("")
    : `^(${trimmed})`;
}

function wrap(value: string) {
  const trimmed = value.trim();
  return /^[\w.]+$/.test(trimmed) ? trimmed : `(${trimmed})`;
}
