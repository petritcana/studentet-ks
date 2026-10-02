/**
 * Fotografimi i ekraneve për rishikim vizual.
 *
 * Nuk është prove automatike: është menyra për te parë vetë se çfarë sheh
 * studenti, ne te dyja gjuhet dhe ne te dyja temat, para se te vazhdohet me
 * fazen tjetër.
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = process.argv[3] ?? join(process.cwd(), "shots");
const PASSWORD = "provoje123";

mkdirSync(OUT, { recursive: true });

/** Një kontekst i vecante për secilen kombinim gjuhe dhe teme. */
async function makeContext(browser, { email, locale, theme, width = 1440, height = 960 }) {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: theme === "dark" ? "dark" : "light",
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // Hyrja përmes formes, që sesioni te jete i vërtetë.
  await page.goto(`${BASE}/hyr`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 30_000 }).catch(() => {});

  await context.addCookies([
    { name: "gjuha", value: locale, url: BASE },
    { name: "theme", value: theme, url: BASE },
  ]);

  return { context, page };
}

async function settle(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(600);
}

async function shoot(page, path, file, action) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await settle(page);
  if (action) {
    await action(page);
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: join(OUT, `${file}.png`), fullPage: false });
  console.log(`  ${file}.png`);
}

const VARIANTS = [
  { locale: "sq", theme: "dark" },
  { locale: "sq", theme: "light" },
  { locale: "en", theme: "dark" },
  { locale: "en", theme: "light" },
];

async function main() {
  const browser = await chromium.launch();
  console.log("Fotografimi nis\n");

  for (const variant of VARIANTS) {
    const tag = `${variant.locale}-${variant.theme}`;
    console.log(`${tag}:`);

    const { context, page } = await makeContext(browser, {
      email: "erza.krasniqi@student.uni-pr.edu",
      ...variant,
    });

    // 1. Ballina me shtyllen e re, stories, nderruesin dhe tri vendet e djathta.
    await shoot(page, "/feed", `1-ballina-${tag}`);

    // 2. Asistenti i hapur mbi ballinen, me faqen e dukshme prapa.
    await shoot(page, "/feed", `2-asistenti-${tag}`, async (p) => {
      await p.getByRole("button", { name: /Hap asistentin|Open the assistant/ }).click();
    });

    // 3. Karriera me punet tri për rresht.
    await shoot(page, "/karriera", `3-karriera-${tag}`);

    // 4. Materiali i kycur me parapamje dhe fleten e PRO-s.
    // Materiali merret nga argumenti, që fotoja te jete gjithmonë e njejta.
    const locked = process.env.LOCKED_MATERIAL;
    if (locked) {
      await shoot(page, `/materialet/${locked}`, `4-material-kycur-${tag}`);
      await shoot(page, `/materialet/${locked}`, `5-paywall-${tag}`, async (p) => {
        await p
          .getByRole("button", { name: /Hape me PRO|Hape me Pro|Open with PRO|Open with Pro/ })
          .first()
          .click();
      });
    }

    // 6. Celulari: ballina me navigim te poshtem.
    await page.setViewportSize({ width: 390, height: 844 });
    await shoot(page, "/feed", `6-celular-${tag}`);
    await page.setViewportSize({ width: 1440, height: 960 });

    await context.close();
  }

  await browser.close();
  console.log(`\nTe ruajtura te ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
