/**
 * Tri temat: Sistemi (blu, parazgjedhja), Errësirë (e zezë) dhe Dritë (e bardhë).
 *
 * Hyn si petrit.cana, kontrollon ngjyrën e vërtetë të sfondit për secilën temë,
 * zgjedhjen nga menyja e avatarit dhe nga shiriti, dhe që zgjedhja mbetet pas
 * rifreskimit. Bën edhe foto të ballinës për secilën temë te dosja e përkohshme.
 */

import { chromium } from "playwright";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
let failures = 0;
function check(label, ok, detail = "") {
  console.log(`  ${ok ? "OK  " : "DESH"} ${label}${ok || !detail ? "" : `  (${detail})`}`);
  if (!ok) failures += 1;
}

const browser = await chromium.launch();
const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "sq" });
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(`${BASE}/hyr`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "petrit.cana");
await page.fill('input[name="password"]', "12341234");
await page.click("[data-login-submit]");
await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 30000 });
await page.goto(`${BASE}/feed`, { waitUntil: "networkidle" });

const state = () =>
  page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    bg: getComputedStyle(document.body).backgroundColor,
    text: getComputedStyle(document.body).color,
  }));

console.log("\nParazgjedhja");
let now = await state();
check("tema e parë është «Sistemi», blu", now.theme === "blue" && now.bg === "rgb(15, 36, 81)", JSON.stringify(now));
check("shiriti ka tri zgjedhje", (await page.locator("header [data-color-mode]").count()) === 3);

const shots = [];
async function shot(name) {
  const path = join(tmpdir(), `tema-${name}.png`);
  await page.screenshot({ path });
  shots.push(path);
}
await shot("sistemi");

console.log("\nNga menyja e avatarit");
async function pickFromMenu(mode) {
  await page.getByRole("button", { name: "Hap menynë e llogarisë" }).click();
  await page.locator(`[role="menuitemradio"][data-color-mode="${mode}"]`).click();
  await page.waitForTimeout(300);
}
await pickFromMenu("dark");
now = await state();
check("Errësirë: sfondi pothuaj i zi, teksti i bardhë", now.theme === "dark" && now.bg === "rgb(11, 13, 18)" && now.text === "rgb(255, 255, 255)", JSON.stringify(now));
await shot("erresire");

await pickFromMenu("light");
now = await state();
check("Dritë: sfondi gri-kaltër i butë", now.theme === "light" && now.bg === "rgb(238, 242, 248)", JSON.stringify(now));
await shot("drite");

await page.reload({ waitUntil: "networkidle" });
now = await state();
check("zgjedhja mbetet pas rifreskimit", now.theme === "light", JSON.stringify(now));

console.log("\nNga shiriti");
await page.locator('header [data-color-mode="blue"]').click();
await page.waitForTimeout(300);
now = await state();
check("Sistemi e kthen blunë", now.theme === "blue" && now.bg === "rgb(15, 36, 81)", JSON.stringify(now));
check("butoni aktiv është «Sistemi»", (await page.locator('header [data-color-mode="blue"]').getAttribute("aria-checked")) === "true");

check("asnjë gabim JavaScript", errors.length === 0, errors.join(" | "));
console.log(`\nFotot: ${shots.join(", ")}`);

await browser.close();
console.log(failures === 0 ? "\nGjithçka kaloi." : `\n${failures} prova dështuan.`);
process.exit(failures === 0 ? 0 : 1);
