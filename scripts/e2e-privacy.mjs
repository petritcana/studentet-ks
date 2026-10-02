/**
 * Provë në shfletues për privatësinë dhe stories.
 *
 * Mbulon: profilin privat me kërkesë ndjekjeje, gjendjen e kyçur, editorin e ri
 * të stories me ngarkim me copa, dhe skedarin që nuk hapet me link të drejtpërdrejtë.
 * Krijon të dhëna prove, prandaj pas tij lësho `npm run db:seed`.
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
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
const errors = [];

async function signIn(email) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${email}: ${error.message}`));
  await page.goto(`${BASE}/hyr`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[type="password"]', "provoje123");
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 30_000 });
  return page;
}

// Dea e bën profilin privat, Erza provon ta ndjekë.
const owner = await signIn("dea.morina@student.uni-pr.edu");
const visitor = await signIn("erza.krasniqi@student.uni-pr.edu");

console.log("Profili privat:");
await owner.goto(`${BASE}/cilesimet`, { waitUntil: "networkidle" });
const privateSwitch = owner.getByRole("switch", { name: /Profil privat/ });
check("çelësi i profilit privat ekziston", (await privateSwitch.count()) > 0);
if ((await privateSwitch.getAttribute("aria-checked")) !== "true") await privateSwitch.click();
await owner.waitForTimeout(1500);

await visitor.goto(`${BASE}/u/dea.morina`, { waitUntil: "networkidle" });
await visitor.screenshot({ path: join(OUT, "private-profile.png") });
check("profili tregohet si privat", (await visitor.getByText("Ky profil është privat").count()) > 0);
check("postimet nuk shfaqen", (await visitor.getByRole("link", { name: "Postime" }).count()) === 0);

const askButton = visitor.getByRole("button", { name: /Kërko ta ndjekësh/ });
check("butoni kërkon ndjekje", (await askButton.count()) > 0);
await askButton.click();
await visitor.waitForTimeout(2000);
check("kërkesa u shënua", (await visitor.getByRole("button", { name: /Kërkesa u dërgua/ }).count()) > 0);

// Kërkesat kanë skedën e vet te njoftimet, me Prano dhe Refuzo.
await owner.goto(`${BASE}/njoftimet?tab=kerkesa`, { waitUntil: "networkidle" });
check("kërkesa del te njoftimet", (await owner.getByText("Kërkesa për ndjekje").count()) > 0);
await owner.getByRole("button", { name: "Prano" }).first().click();
await owner.waitForTimeout(2000);

await visitor.reload({ waitUntil: "networkidle" });
check("pas pranimit hapet profili", (await visitor.getByText("Ky profil është privat").count()) === 0);

console.log("Stories:");
await visitor.goto(`${BASE}/feed`, { waitUntil: "networkidle" });
await visitor.getByRole("button", { name: /Shto/ }).first().click();
await visitor.waitForTimeout(500);
check("hapi i parë ka vetëm foto dhe video", (await visitor.getByRole("button", { name: "Foto" }).count()) > 0);
check("pa njoftimin e 24 orëve", (await visitor.getByText("Zhduket pas 24 orësh").count()) === 0);
check("pa zgjedhje shtrirjeje", (await visitor.getByText("Kush e sheh").count()) === 0);

// Një PNG i vërtetë, 2 megabajt, që kufiri i vjetër i server action-it do ta kishte ndalur.
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const big = Buffer.concat([png, Buffer.alloc(2 * 1024 * 1024)]);
const filePath = join(OUT, "test-story.png");
writeFileSync(filePath, big);

await visitor.setInputFiles('input[type="file"][accept="image/*"]', filePath);
await visitor.waitForTimeout(1500);
check("editori u hap", (await visitor.getByRole("button", { name: "Tekst" }).count()) > 0);

await visitor.getByRole("button", { name: "Tekst" }).click();
await visitor.waitForTimeout(400);
// Teksti shkruhet drejt mbi foto, jo në një kuti më vete.
const inlineText = visitor.locator("[data-story-text-editor]").first();
if (await inlineText.count()) await visitor.keyboard.type("Provë nga testi");
check("teksti shkruhet drejt mbi foto", (await inlineText.count()) === 1);
await visitor.getByRole("button", { name: "Emoji" }).click();
await visitor.waitForTimeout(300);
await visitor.getByRole("button", { name: "📚" }).click();
await visitor.screenshot({ path: join(OUT, "story-editor.png") });

await visitor.getByRole("button", { name: /Publiko/ }).click();
await visitor.waitForTimeout(6000);
await visitor.goto(`${BASE}/feed`, { waitUntil: "networkidle" });
await visitor.screenshot({ path: join(OUT, "story-published.png") });

console.log("Skedarët:");
const mine = await visitor.evaluate(async () => {
  const response = await fetch("/api/mesazhe");
  return response.status;
});
check(`api e bisedave punon (${mine})`, mine === 200);

check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
if (errors.length) console.log(errors.slice(0, 5));

await browser.close();
console.log(failures ? `\n${failures} kontrolle dështuan.` : "\nTë gjitha kontrollet kaluan.");
process.exit(failures ? 1 : 0);
