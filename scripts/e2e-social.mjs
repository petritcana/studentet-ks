/**
 * Kalim i shpejtë në shfletues mbi veçoritë sociale: reagimet, riposti, tregu,
 * grupet e bisedës dhe profili. Nis serverin e prodhimit para se ta lëshosh.
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = join(process.cwd(), "shots", "e2e");
mkdirSync(OUT, { recursive: true });

let failures = 0;
function check(label, ok) {
  console.log(`  ${ok ? "OK  " : "DESH"} ${label}`);
  if (!ok) failures += 1;
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(`${BASE}/hyr`);
await page.fill('input[name="email"]', "erza.krasniqi@student.uni-pr.edu");
await page.fill('input[type="password"]', "provoje123");
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 30_000 });

console.log("Ballina:");
await page.goto(`${BASE}/feed`, { waitUntil: "networkidle" });
const logos = await page.locator('a[aria-label*="Studentët"], a[aria-label*="STUDENTËT"]').count();
check(`logo vetëm një herë (${logos})`, logos <= 1);
const like = page.getByRole("button", { name: /Pëlqe/ }).first();
check("butoni Pëlqe ekziston", (await like.count()) > 0);
check("nuk ka më Pajtohem", (await page.getByText("Pajtohem").count()) === 0);
check("nuk ka më E dobishme", (await page.getByRole("button", { name: /dobishme/i }).count()) === 0);
check("hapësira jonë në shtyllë", (await page.locator("[data-announcement-board]").count()) > 0);
const repost = page.getByRole("button", { name: /Riposto/ }).first();
check("butoni Riposto ekziston", (await repost.count()) > 0);
if (await like.count()) {
  const before = await like.getAttribute("aria-pressed");
  await like.click();
  await page.waitForTimeout(800);
  check("pëlqimi ndryshon gjendjen", (await like.getAttribute("aria-pressed")) !== before);
}
await page.screenshot({ path: join(OUT, "feed.png") });

await page.getByRole("button", { name: "Posto" }).first().click();
await page.waitForTimeout(600);
const composer = await page.getByRole("dialog").first().boundingBox();
const middle = composer ? composer.y + composer.height / 2 : 0;
check(`kompozuesi del në mes (${Math.round(middle)})`, Math.abs(middle - 480) < 120);
await page.keyboard.press("Escape");
await page.waitForTimeout(400);

console.log("Tregu:");
await page.goto(`${BASE}/tregu`, { waitUntil: "networkidle" });
const listings = await page.locator('a[href^="/tregu/c"]').count();
check(`shpallje në listë (${listings})`, listings > 0);
await page.screenshot({ path: join(OUT, "market.png") });
await page.goto(`${BASE}/tregu/shto`, { waitUntil: "networkidle" });
await page.getByLabel(/Titulli/).fill("Libër i Statistikës për shitje");
await page.getByLabel(/Përshkrimi/).fill("I ruajtur mirë, pa shënime. Takohemi te biblioteka.");
await page.getByLabel(/Çmimi/).fill("12");
await page.getByRole("button", { name: "Publiko" }).click();
await page.waitForURL(/\/tregu\/c/, { timeout: 15_000 }).catch(() => {});
check(`shpallja u krijua (${new URL(page.url()).pathname})`, /\/tregu\/c/.test(page.url()));
await page.screenshot({ path: join(OUT, "listing.png") });

console.log("Grupet:");
await page.goto(`${BASE}/mesazhe`, { waitUntil: "networkidle" });
check("grupi demo në listë", (await page.getByText("Grupi i Statistikës").count()) > 0);
await page.getByRole("button", { name: "Grup i ri" }).click();
await page.getByLabel("Emri i grupit").fill("Projekti i Bazave");
const people = page.locator('[role="dialog"] ul button');
const available = await people.count();
check(`ka njerëz për t'u zgjedhur (${available})`, available >= 2);
if (available >= 2) {
  await people.nth(0).click();
  await people.nth(1).click();
  await page.getByRole("button", { name: "Krijo grupin" }).click();
  await page.waitForURL(/\/mesazhe\/c/, { timeout: 15_000 }).catch(() => {});
  check("u hap biseda e grupit", /\/mesazhe\/c/.test(page.url()));
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  check("koka tregon emrin e grupit", (await page.getByText("Projekti i Bazave").count()) > 0);
  await page.getByPlaceholder(/Shkruaj mesazhin/).click();
  await page.getByPlaceholder(/Shkruaj mesazhin/).fill("Përshëndetje grup!");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(4000);
  check("mesazhi u dërgua", (await page.getByText("Përshëndetje grup!").count()) > 0);
  await page.screenshot({ path: join(OUT, "group.png") });
}

console.log("Profili:");
await page.goto(`${BASE}/u/${process.env.PROFILE ?? "erza.krasniqi"}`, { waitUntil: "networkidle" });
await page.screenshot({ path: join(OUT, "profile.png") });
check("profili ka Shokë", (await page.getByText("Shokë").count()) > 0);
check("profili nuk ka tab Arritjet", (await page.getByRole("link", { name: "Arritjet" }).count()) === 0);

console.log("Tema:");
check("nuk ka opsion Sistemi në faqe", (await page.getByRole("radio", { name: "Sistemi" }).count()) === 0);

console.log("Ridrejtimet:");
for (const path of ["/eksploro", "/pyetje"]) {
  const response = await page.goto(`${BASE}${path}`);
  check(`${path} nuk jep 404 (${response?.status()})`, response?.status() === 200);
}

check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
if (errors.length) console.log(errors.slice(0, 5));

await browser.close();
console.log(failures ? `\n${failures} kontrolle dështuan.` : "\nTë gjitha kontrollet kaluan.");
process.exit(failures ? 1 : 0);
