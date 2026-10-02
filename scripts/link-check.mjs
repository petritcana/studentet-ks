/**
 * Asnjë buton dhe asnjë lidhje e vdekur.
 *
 * Kalon faqet kryesore si student i kyçur, mbledh çdo lidhje të brendshme dhe e
 * hap me sesionin e njëjtë, pastaj shënon butonat pa tekst dhe pa etiketë, sepse
 * ata janë të paklikueshëm për lexuesit e ekranit.
 */

import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const EMAIL = process.argv[3] ?? "erza.krasniqi@student.uni-pr.edu";
const PASSWORD = process.argv[4] ?? "provoje123";

const PAGES = [
  "/feed",
  "/materialet",
  "/materialet/ngarko",
  "/karriera",
  "/komuniteti",
  "/tregu",
  "/tregu/shto",
  "/mesazhe",
  "/njoftimet",
  "/une",
  "/une/pro",
  "/une/xp",
  "/une/te-ruajtura",
  "/cilesimet",
  "/kurset",
  "/renditja",
];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
const jsErrors = [];
// Faqja ku ndodhi gabimi shkruhet bashkë me të, që një gabim i rrallë të gjurmohet.
page.on("pageerror", (error) => jsErrors.push(`${new URL(page.url()).pathname}: ${error.message}`));

await page.goto(`${BASE}/hyr`, { waitUntil: "domcontentloaded" });
await page.fill('input[name="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 60_000 });

const links = new Set();
const silentButtons = [];
let failures = 0;

for (const path of PAGES) {
  const response = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  const status = response?.status() ?? 0;
  if (status !== 200) {
    failures += 1;
    console.log(`  DESH ${path} (${status})`);
  }

  for (const href of await page.locator("a[href]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")))) {
    if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:")) continue;
    links.add(href.split("?")[0]);
  }

  const silent = await page.locator("button").evaluateAll((nodes) =>
    nodes
      .filter((node) => {
        // Një çelës pa tekst është në rregull kur e mban një <label for>.
        const id = node.getAttribute("id");
        const labelled = id ? document.querySelector(`label[for="${id}"]`) : null;
        return (
          !node.textContent?.trim() &&
          !node.getAttribute("aria-label") &&
          !node.getAttribute("aria-labelledby") &&
          !node.getAttribute("title") &&
          !labelled
        );
      })
      .map((node) => node.outerHTML.slice(0, 80)),
  );
  for (const button of silent) silentButtons.push(`${path}: ${button}`);
}

console.log(`\nLidhje të brendshme për t'u provuar: ${links.size}`);
const cookies = await context.cookies();
const cookieHeader = cookies.map((item) => `${item.name}=${item.value}`).join("; ");

for (const href of [...links].sort()) {
  const response = await fetch(`${BASE}${href}`, { headers: { cookie: cookieHeader }, redirect: "manual" });
  const ok = response.status === 200 || response.status === 307 || response.status === 308;
  if (!ok) {
    failures += 1;
    console.log(`  DESH ${href} (${response.status})`);
  }
}

if (silentButtons.length > 0) {
  console.log(`\nButona pa tekst dhe pa etiketë: ${silentButtons.length}`);
  for (const button of silentButtons.slice(0, 10)) console.log(`  ${button}`);
}

console.log(`\nGabime JavaScript: ${jsErrors.length}`);
for (const error of jsErrors.slice(0, 5)) console.log(`  ${error}`);

await browser.close();
console.log(failures === 0 ? "\nAsnjë lidhje e vdekur." : `\n${failures} probleme.`);
process.exit(failures === 0 && jsErrors.length === 0 ? 0 : 1);
