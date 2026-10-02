/** Kontrolli i përkthimeve, në dy pjesë. */

import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { globSync } from "node:fs";

const ROOT = process.cwd();
const DIR = join(ROOT, "messages");

function flatten(value, prefix = "", out = new Map()) {
  for (const [key, entry] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (entry && typeof entry === "object" && !Array.isArray(entry)) flatten(entry, path, out);
    else out.set(path, entry);
  }
  return out;
}

// {name} dhe {name, plural, ...} numërohen si i njëjti argument. Trupi i një
// alternative («economics {Ekonomi}», «one {# ditë}») nuk është argument: para tij
// rri çelësi i alternativës, pas «select,» ose pas kllapës së alternativës së kaluar.
function placeholders(text) {
  if (typeof text !== "string") return [];
  const names = new Set();

  const skipToClose = (i) => {
    let depth = 1;
    while (i < text.length && depth > 0) {
      if (text[i] === "{") depth += 1;
      else if (text[i] === "}") depth -= 1;
      i += 1;
    }
    return i;
  };

  // Një mesazh: tekst i lirë me argumente brenda. Mbaron te «}» kur është trup alternative.
  const message = (i, nested) => {
    while (i < text.length) {
      if (text[i] === "}" && nested) return i + 1;
      i = text[i] === "{" ? argument(i + 1) : i + 1;
    }
    return i;
  };

  // Një argument: {emri}, {emri, number}, ose {emri, select, çelës {mesazh} ...}.
  const argument = (i) => {
    const head = /^\s*(\w+)\s*(?:,\s*(plural|select|selectordinal)\s*,)?/.exec(text.slice(i));
    if (!head) return skipToClose(i);
    names.add(head[1]);
    i += head[0].length;
    if (!head[2]) return skipToClose(i);
    while (i < text.length) {
      while (/\s/.test(text[i] ?? "")) i += 1;
      if (text[i] === "}") return i + 1;
      while (i < text.length && text[i] !== "{" && text[i] !== "}") i += 1;
      if (text[i] === "{") i = message(i + 1, true);
    }
    return i;
  };

  message(0, false);
  return [...names].sort();
}

const files = readdirSync(DIR).filter((name) => name.endsWith(".json"));
const catalogs = new Map(
  files.map((file) => [
    file.replace(".json", ""),
    flatten(JSON.parse(readFileSync(join(DIR, file), "utf8"))),
  ]),
);

const locales = [...catalogs.keys()];
const allKeys = new Set(locales.flatMap((locale) => [...catalogs.get(locale).keys()]));

let problems = 0;

for (const key of [...allKeys].sort()) {
  for (const locale of locales) {
    const catalog = catalogs.get(locale);
    if (!catalog.has(key)) {
      console.log(`  mungon  ${locale}  ${key}`);
      problems += 1;
      continue;
    }
    const value = catalog.get(key);
    if (typeof value !== "string" || value.trim() === "") {
      console.log(`  bosh    ${locale}  ${key}`);
      problems += 1;
    }
  }

  const shapes = locales
    .filter((locale) => catalogs.get(locale).has(key))
    .map((locale) => placeholders(catalogs.get(locale).get(key)).join(","));
  if (new Set(shapes).size > 1) {
    console.log(`  ndryshe ${key}  (${shapes.join(" | ")})`);
    problems += 1;
  }
}

// --- 2. Çelësat e përdorur në kod -------------------------------------------

const sources = globSync("**/*.{ts,tsx}", {
  cwd: ROOT,
  exclude: (name) => name === "node_modules" || name === ".next",
});

const NAMESPACE = /const\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*"([^"]+)"\s*\)/g;

/**
 * Çelësat që presin të paktën një vlerë.
 *
 * Një çelës si "{count} shkarkime", i thirrur pa argument, e nxjerr vetë tekstin
 * "{count} shkarkime" drejt e te ekrani. Ndodhi një herë dhe u kap vetëm me sy.
 */
const parameterised = new Map();
for (const [key, value] of catalogs.get("sq") ?? []) {
  const names = [...String(value).matchAll(/\{(\w+)[,}]/g)].map((match) => match[1]);
  if (names.length > 0) parameterised.set(key, names);
}

for (const relativePath of sources) {
  const source = readFileSync(join(ROOT, relativePath), "utf8");

  // Një skedar mund të ketë disa komponentë; nëse i njëjti emër variable lidhet
  // me dy hapësira të ndryshme, e kalojmë për të mos raportuar gabim të rremë.
  const bindings = new Map();
  for (const match of source.matchAll(NAMESPACE)) {
    const [, variable, namespace] = match;
    if (bindings.has(variable) && bindings.get(variable) !== namespace) {
      bindings.set(variable, null);
    } else if (!bindings.has(variable)) {
      bindings.set(variable, namespace);
    }
  }

  for (const [variable, namespace] of bindings) {
    if (!namespace) continue;
    const usage = new RegExp(`\\b${variable}\\(\\s*"([^"$\`]+)"\\s*([,)])`, "g");
    for (const match of source.matchAll(usage)) {
      const full = `${namespace}.${match[1]}`;
      if (!allKeys.has(full)) {
        console.log(`  i panjohur ${relative(ROOT, relativePath)}  ${variable}("${match[1]}") -> ${full}`);
        problems += 1;
        continue;
      }

      // Mbyllja menjëherë pas çelësit do të thotë thirrje pa argumente.
      if (match[2] === ")" && parameterised.has(full)) {
        const names = parameterised.get(full).join("}, {");
        console.log(
          `  pa vlera  ${relative(ROOT, relativePath)}  ${variable}("${match[1]}") pret {${names}}`,
        );
        problems += 1;
      }
    }
  }
}

const counts = locales.map((locale) => `${locale}: ${catalogs.get(locale).size}`).join(", ");

if (problems === 0) {
  console.log(`Katalogët përputhen dhe çdo çelës i përdorur ekziston. ${counts}`);
  process.exit(0);
}

console.log(`\n${problems} probleme. ${counts}`);
process.exit(1);
