/**
 * Bashkon një copë katalogu në `messages/sq.json` dhe `messages/en.json`.
 *
 * Përdoret gjatë zhvillimit që çelësat e rinj të shtohen njëkohësisht në të dyja
 * gjuhët. Pranon një skedar JSON me formën { "sq": {...}, "en": {...} }.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [, , patchPath] = process.argv;
if (!patchPath) {
  console.error("Përdorimi: node scripts/merge-messages.mjs <patch.json>");
  process.exit(1);
}

const patch = JSON.parse(readFileSync(patchPath, "utf8"));

function deepMerge(base, extra) {
  for (const [key, value] of Object.entries(extra)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (!base[key] || typeof base[key] !== "object") base[key] = {};
      deepMerge(base[key], value);
    } else {
      base[key] = value;
    }
  }
  return base;
}

for (const locale of ["sq", "en"]) {
  if (!patch[locale]) continue;
  const file = join(process.cwd(), "messages", `${locale}.json`);
  const catalog = JSON.parse(readFileSync(file, "utf8"));
  deepMerge(catalog, patch[locale]);
  writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
}

console.log("Katalogët u përditësuan.");
