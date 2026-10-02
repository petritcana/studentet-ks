/**
 * Provë në shfletues për pamjen e re të hyrjes dhe regjistrimit.
 *
 * «Mirë se vjen» me Google (demo, rreth 1.4s) dhe me email studentor, ekrani
 * «Krijo llogarinë tënde» me username-in e kontrolluar, fuqinë e password-it,
 * listën e rregullave dhe përputhjen, hyrja me gabimin e kuq, dhe «Ke harruar
 * password-in?». Në fund, pamja në celular. Nuk krijon të dhëna.
 */

import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`  ${ok ? "OK  " : "DESH"} ${label}${ok || !detail ? "" : `  (${detail})`}`);
  if (!ok) failures += 1;
}

const browser = await chromium.launch();
const errors = [];
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));

/* ------------------------------------------------------------------ */
console.log("Mirë se vjen:");
await page.goto(`${BASE}/regjistrohu`, { waitUntil: "networkidle" });
check("titulli", (await page.getByRole("heading", { level: 1, name: "Mirë se vjen në Studentët.KS" }).count()) === 1);
const google = page.locator("[data-google-button]");
check("Google me etiketën REKOMANDOHET", (await google.count()) === 1 && (await page.getByText("REKOMANDOHET").count()) === 1);
check("ndarësi «ose»", (await page.getByRole("separator", { name: "ose" }).count()) === 1);
check("kutia e ndihmës për @student.uni-pr.edu", (await page.getByText("@student.uni-pr.edu").count()) >= 1);
check("«Hyr këtu» dhe rreshti ligjor", (await page.getByRole("link", { name: "Hyr këtu" }).count()) === 1 && (await page.getByRole("link", { name: "kushtet e përdorimit" }).count()) === 1);

await page.locator("[data-email-signup]").click();
await page.waitForSelector('[data-auth-screen="register"]');
check(
  "email studentor hap formularin: emri, mbiemri, data e lindjes, emaili, password-i",
  (await page.locator("#reg-first").count()) === 1 &&
    (await page.locator("#reg-last").count()) === 1 &&
    (await page.locator("#reg-birth").count()) === 1 &&
    (await page.locator("#reg-email").count()) === 1 &&
    (await page.locator("#reg-password").count()) === 1,
);
await page.goto(`${BASE}/regjistrohu`, { waitUntil: "networkidle" });

// Me Google të lidhur, butoni çon te Google; pa të, pret rreth 1.4s dhe hap «Krijo llogarinë tënde».
let googleTarget = null;
await page.route("https://accounts.google.com/**", (route) => {
  googleTarget = route.request().url();
  return route.fulfill({ status: 200, contentType: "text/html", body: "google" });
});
await page.locator("[data-google-button]").click();
await page.waitForTimeout(250);
const busy = page.locator('[data-google-button][aria-busy="true"]');
const busyShown = (await busy.count()) === 1 && (await busy.innerText().catch(() => "")).includes("Duke u lidhur me Google");
await page
  .waitForURL((url) => url.href.includes("accounts.google.com") || url.pathname.includes("/regjistrohu/llogaria"), { timeout: 8000 })
  .catch(() => {});
if (googleTarget) {
  const target = new URL(googleTarget);
  check("Google i vërtetë: kthehet te /api/auth/callback/google", target.searchParams.get("redirect_uri") === `${BASE}/api/auth/callback/google`);
  check("zgjedhja e llogarisë del gjithmonë", target.searchParams.get("prompt") === "select_account");
  console.log("  (Google është i lidhur: ekrani pas Google-it provohet te npm run e2e:google-flow)");
} else {
  check("Google pret: i çaktivizuar, me «Duke u lidhur me Google…»", busyShown);
  check("pas rreth 1.4s del «Krijo llogarinë tënde»", page.url().includes("/regjistrohu/llogaria"));
}

/* ------------------------------------------------------------------ */
if (!googleTarget) {
console.log("\nKrijo llogarinë tënde:");
await page.waitForLoadState("networkidle");
const stepper = page.locator("[data-auth-stepper]");
check("hapat: Google gati, Llogaria aktive, +5", (await stepper.getByText("Google").count()) === 1 && (await stepper.locator('[aria-current="step"]').innerText()).includes("Llogaria") && (await stepper.getByText("+5").count()) === 1);
check("karta me emailin dhe «Email studentor»", (await page.locator("[data-verified-card]").innerText()).includes("petrit.cana@student.uni-pr.edu") && (await page.getByText("Email studentor", { exact: true }).count()) === 1);
check("emri vetëm për lexim, «Nga Google»", (await page.locator("#setup-name").getAttribute("readonly")) !== null && (await page.getByText("Nga Google", { exact: true }).count()) === 1);
await page.locator('[data-username-status="free"]').waitFor({ timeout: 8000 });
const username = await page.locator("#setup-username").inputValue();
check("username u kontrollua: «I lirë»", /^petrit\.cana\d*$/.test(username), username);
check("ndihma tregon profilin", (await page.getByText(`studentet.ks/${username}`).count()) >= 1 || (await page.locator("#setup-username-help").innerText()).includes(username));

const cont = page.locator("[data-setup-continue]");
check("«Vazhdo» i mbyllur pa password", await cont.isDisabled());
await page.locator("#setup-password").fill("studenti");
check("«studenti»: E dobët", (await page.locator("#setup-password-strength").innerText()).includes("E dobët"));
await page.locator("#setup-password").fill("Studenti!2026");
check("«Studenti!2026»: E fortë dhe katër rregullat", (await page.locator("#setup-password-strength").innerText()).includes("E fortë") && (await page.locator('[data-rule][data-ok="true"]').count()) === 4);
await page.locator("#setup-confirm").fill("Studenti!202");
check("mospërputhje: mesazh i kuq dhe kufi i kuq", (await page.getByText("Password-et nuk përputhen").count()) === 1 && (await page.locator('#setup-confirm').getAttribute("aria-invalid")) === "true");
check("«Vazhdo» mbetet i mbyllur", await cont.isDisabled());
await page.locator("#setup-confirm").fill("Studenti!2026");
check("përputhje: «Password-et përputhen»", (await page.getByText("Password-et përputhen").count()) === 1);
check("pa datën e lindjes «Vazhdo» mbetet i mbyllur", await cont.isDisabled());
await page.locator("#setup-birth").fill("2003-04-10");
check("«Vazhdo» hapet", await cont.isEnabled());
const eye = page.locator("#setup-password").locator("xpath=..").locator("[data-eye]");
check("syri ka aria-label", (await eye.getAttribute("aria-label")) === "Shfaq password-in");
await eye.click();
check("syri e shfaq password-in", (await page.locator("#setup-password").getAttribute("type")) === "text" && (await eye.getAttribute("aria-label")) === "Fshih password-in");
check("rreshti «Pastaj:» me hapat e onboarding-ut", (await page.getByText("Pastaj:").count()) === 1 && (await page.getByText("Foto e ID-së").count()) === 1);
await cont.click();
check("pa sesion: pamja e vazhdimit", (await page.locator('[data-auth-screen="handoff"]').count()) === 1);

}

/* ------------------------------------------------------------------ */
console.log("\nHyrja:");
await page.goto(`${BASE}/hyr`, { waitUntil: "networkidle" });
check("titulli «Hyr në Studentët.KS»", (await page.getByRole("heading", { level: 1, name: "Hyr në Studentët.KS" }).count()) === 1);
check("etiketat e vërteta te fushat", (await page.getByLabel("Username ose email studentor").count()) === 1 && (await page.getByLabel("Password", { exact: true }).count()) === 1);
check("«Ke harruar password-in?» te etiketa", (await page.getByRole("link", { name: "Ke harruar password-in?" }).count()) === 1);
await page.fill('input[name="email"]', "erza.krasniqi@student.uni-pr.edu");
await page.fill('input[name="password"]', "gabim-gabim");
await page.locator("[data-login-submit]").click();
await page.locator('[data-auth-alert="error"]').waitFor({ timeout: 15000 });
check("gabimi: alarmi i kuq lart", (await page.getByText("Username ose password i pasaktë.").count()) === 1);
check("gabimi: kufi i kuq te password-i, i lidhur me alarmin", (await page.locator("#password").getAttribute("aria-invalid")) === "true" && (await page.locator("#password").getAttribute("aria-describedby")) === "login-error");
check("username-i mbetet pas gabimit", (await page.inputValue('input[name="email"]')) === "erza.krasniqi@student.uni-pr.edu");
await page.fill('input[name="password"]', "provoje123");
await page.locator("[data-login-submit]").click();
const entered = await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 30000 }).then(() => true).catch(() => false);
check("hyrja e vërtetë punon si më parë", entered, page.url());
await context.clearCookies();

/* ------------------------------------------------------------------ */
console.log("\nKe harruar password-in:");
await page.goto(`${BASE}/harrova-password`, { waitUntil: "networkidle" });
check("lidhja «Kthehu te hyrja»", (await page.getByRole("link", { name: "Kthehu te hyrja" }).count()) === 1);
check("«Vazhdo me Google» për password të ri", (await page.locator("[data-google-button]").count()) === 1);
check("pa email të lidhur, asnjë lidhje që e sheh dikush tjetër", (await page.locator("[data-forgot-submit]").count()) === 0);

/* ------------------------------------------------------------------ */
console.log("\nCelulari (390px):");
const mobile = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
mobile.on("pageerror", (error) => errors.push(error.message));
if (googleTarget) {
  // Me Google të lidhur, ekrani i llogarisë hapet vetëm pas Google-it: në celular provohet hyrja.
  await mobile.goto(`${BASE}/hyr`, { waitUntil: "networkidle" });
} else {
await mobile.goto(`${BASE}/regjistrohu/llogaria`, { waitUntil: "networkidle" });
const tiles = await mobile.locator("[data-verified-card] + div > div").evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top));
check("kartat shpjeguese njëra nën tjetrën", tiles.length === 2 && tiles[1] > tiles[0] + 20);
const rules = await mobile.locator("#setup-password-rules > li").evaluateAll((nodes) => new Set(nodes.map((node) => Math.round(node.getBoundingClientRect().left))).size);
check("lista e rregullave në një kolonë", rules === 1);
const labelWidth = await mobile.locator("[data-auth-stepper]").getByText("Institucioni").evaluate((node) => node.getBoundingClientRect().width);
check("hapat vetëm me numra", labelWidth <= 1, String(labelWidth));
}
check("globi i gjuhës fshihet", !(await mobile.getByRole("button", { name: /gjuh|language/i }).first().isVisible().catch(() => false)));
if (!googleTarget) {
  const card = await mobile.locator("[data-verified-card]").boundingBox();
  check("karta e verifikimit mbetet e ulët", card.height < 150, String(card.height));
}
check("pa rrëshqitje anash", !(await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));

check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
if (errors.length) console.log(errors.join("\n"));

await browser.close();
console.log(failures === 0 ? "\nTë gjitha kontrollet kaluan." : `\n${failures} kontrolle dështuan.`);
process.exit(failures === 0 ? 0 : 1);
