import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastLevel, contrastRatio } from "@/lib/contrast";
import { FACULTY_CODES, facultyVars } from "@/lib/faculties";

const CSS = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

function block(selector: string) {
  const index = CSS.indexOf(selector);
  if (index === -1) throw new Error(`Nuk u gjet blloku ${selector}`);
  const start = CSS.indexOf("{", index);
  let depth = 0;

  for (let cursor = start; cursor < CSS.length; cursor += 1) {
    if (CSS[cursor] === "{") depth += 1;
    if (CSS[cursor] === "}") {
      depth -= 1;
      if (depth === 0) return CSS.slice(start + 1, cursor);
    }
  }
  throw new Error(`Blloku ${selector} nuk mbyllet`);
}

const hex2 = (value: number) => Math.round(value).toString(16).padStart(2, "0");

/**
 * Ngjyrat e tokenave. Xhami i errësirës (`rgb(255 255 255 / 0.04)`) përzihet mbi
 * `--bg` të së njëjtës temë: kontrasti matet mbi ngjyrën që sheh syri.
 */
function variables(source: string, base?: Map<string, string>) {
  const map = new Map<string, string>();
  for (const match of source.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    map.set(match[1], match[2]);
  }
  const under = map.get("--bg") ?? base?.get("--bg");
  for (const match of source.matchAll(/(--[\w-]+)\s*:\s*rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)\s*;/g)) {
    if (!under) continue;
    const alpha = Number(match[5]);
    const back = [1, 3, 5].map((index) => parseInt(under.slice(index, index + 2), 16));
    const mixed = [match[2], match[3], match[4]].map((channel, index) => Number(channel) * alpha + back[index] * (1 - alpha));
    map.set(match[1], `#${mixed.map(hex2).join("")}`);
  }
  return map;
}

const LIGHT = variables(block(":root {"));
const DARK_RAW = variables(block('[data-theme="dark"] {'), LIGHT);

/** Errësira i mbishkruan vetëm disa tokena; të tjerat trashëgohen nga drita. */
const DARK = new Map([...LIGHT, ...DARK_RAW]);

/** «E errët» është e zezë: merr blunë si bazë dhe i mbishkruan sfondet dhe tekstet. */
const BLACK_RAW = variables(block(':root[data-theme="dark"] {'));
const BLACK = new Map([...DARK, ...BLACK_RAW]);

const THEMES = [
  { name: "dritë", vars: LIGHT },
  { name: "blu", vars: DARK },
  { name: "e zezë", vars: BLACK },
] as const;

function value(theme: Map<string, string>, name: string) {
  const found = theme.get(name);
  expect(found, `mungon ${name}`).toBeTruthy();
  return found as string;
}

describe("tokenat bazë ekzistojnë", () => {
  const required = [
    "--brand-500",
    "--brand-600",
    "--brand-50",
    "--accent-500",
    "--success",
    "--warning",
    "--danger",
    "--pro-from",
    "--pro-to",
    "--bg",
    "--surface",
    "--surface-2",
    "--border",
    "--text",
    "--text-muted",
  ];

  it.each(required)("drita e ka %s", (name) => {
    expect(LIGHT.has(name)).toBe(true);
  });

  it("errësira i mbishkruan sipërfaqet dhe tekstin", () => {
    for (const name of ["--bg", "--surface", "--surface-2", "--border", "--text", "--text-muted"]) {
      expect(DARK_RAW.has(name), `errësira duhet ta mbishkruajë ${name}`).toBe(true);
      expect(DARK_RAW.get(name)).not.toBe(LIGHT.get(name));
    }
  });

  it("errësira është pothuaj e zezë dhe drita gri e butë", () => {
    expect(BLACK.get("--bg")).toBe("#0b0d12");
    expect(DARK.get("--bg")).toBe("#0f2451");
  });

  it("i mban vlerat e specifikuara për markën dhe Pro-n në dritë", () => {
    // «Blu»: blu e logos, ari për Pro-n.
    expect(LIGHT.get("--brand-500")).toBe("#1d5fe0");
    expect(LIGHT.get("--brand-600")).toBe("#1749b8");
    expect(LIGHT.get("--accent-500")).toBe("#b7791f");
    expect(LIGHT.get("--pro-from")).toBe("#ffd166");
    expect(LIGHT.get("--pro-to")).toBe("#ffb020");
    expect(LIGHT.get("--bg")).toBe("#eef2f8");
    expect(LIGHT.get("--text")).toBe("#0b1a36");
  });
});

describe("kontrasti i tekstit kryesor", () => {
  const pairs = [
    ["--text", "--bg"],
    ["--text", "--surface"],
    ["--text-muted", "--bg"],
    ["--text-muted", "--surface"],
    ["--brand-500", "--bg"],
    ["--brand-500", "--surface"],
  ] as const;

  for (const theme of THEMES) {
    for (const [fg, bg] of pairs) {
      it(`${theme.name}: ${fg} mbi ${bg} kalon AA`, () => {
        const ratio = contrastRatio(value(theme.vars, fg), value(theme.vars, bg));
        expect(ratio, `${fg} mbi ${bg}`).not.toBeNull();
        expect(ratio!).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

describe("variantet semantike për tekst", () => {
  const pairs = [
    ["--success-text", "--surface"],
    ["--warning-text", "--surface"],
    ["--danger-text", "--bg"],
    ["--accent-text", "--bg"],
  ] as const;

  for (const theme of THEMES) {
    for (const [fg, bg] of pairs) {
      it(`${theme.name}: ${fg} mbi ${bg} kalon AA`, () => {
        const ratio = contrastRatio(value(theme.vars, fg), value(theme.vars, bg));
        expect(ratio!).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

describe("teksti mbi mbushjet e markës dhe të Pro-s", () => {
  for (const theme of THEMES) {
    it(`${theme.name}: --brand-contrast mbi --brand-500 kalon AA`, () => {
      const ratio = contrastRatio(
        value(theme.vars, "--brand-contrast"),
        value(theme.vars, "--brand-500"),
      );
      expect(ratio!).toBeGreaterThanOrEqual(4.5);
    });

    it(`${theme.name}: --pro-contrast kalon AA mbi të dy skajet e gradientit`, () => {
      for (const stop of ["--pro-from", "--pro-to"] as const) {
        const ratio = contrastRatio(value(theme.vars, "--pro-contrast"), value(theme.vars, stop));
        expect(ratio!, `${stop}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

describe("ngjyrat e fakulteteve", () => {
  it("i mbulon të katërmbëdhjetë fakultetet", () => {
    expect(FACULTY_CODES).toHaveLength(14);
    for (const code of FACULTY_CODES) {
      const { fill, text } = facultyVars(code);
      expect(LIGHT.has(fill), `mungon ${fill}`).toBe(true);
      expect(LIGHT.has(text), `mungon ${text}`).toBe(true);
    }
  });

  it("i mbishkruan të gjitha variantet e tekstit në errësirë", () => {
    for (const code of FACULTY_CODES) {
      const { text } = facultyVars(code);
      expect(DARK_RAW.has(text), `errësira duhet ta mbishkruajë ${text}`).toBe(true);
    }
  });

  for (const theme of THEMES) {
    for (const code of FACULTY_CODES) {
      it(`${theme.name}: ${code} si tekst kalon AA mbi sfond dhe kartë`, () => {
        const { text } = facultyVars(code);
        for (const bg of ["--bg", "--surface"] as const) {
          const ratio = contrastRatio(value(theme.vars, text), value(theme.vars, bg));
          expect(ratio!, `${code} mbi ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  }

  /*
   * Mbushja e fakultetit është dekorative: pika 6px dhe sfondi me 10% opacitet
   * shoqërohen gjithmonë nga etiketa me tekst, prandaj kuptimi nuk varet nga
   * ngjyra. Kërkesa reale këtu është dallueshmëria mes fakulteteve, jo 3:1 ndaj
   * sfondit. Kontrastin e mbart varianti `-text`, i mbuluar më lart.
   */
  it("i mban mbushjet të dallueshme nga njëra-tjetra", () => {
    const fills = FACULTY_CODES.map((code) => LIGHT.get(facultyVars(code).fill));
    expect(new Set(fills).size).toBe(FACULTY_CODES.length);
  });

  it("nuk e përdor të njëjtën vlerë për mbushje dhe për tekst", () => {
    for (const code of FACULTY_CODES) {
      const { fill, text } = facultyVars(code);
      expect(LIGHT.get(fill), code).not.toBe(LIGHT.get(text));
    }
  });
});

describe("etiketat e nivelit", () => {
  it("i emërton saktë pragjet", () => {
    expect(contrastLevel(21)).toBe("AAA");
    expect(contrastLevel(5)).toBe("AA");
    expect(contrastLevel(3.2)).toBe("AA-large");
    expect(contrastLevel(1.5)).toBe("fail");
    expect(contrastLevel(3.2, true)).toBe("AA");
  });
});
