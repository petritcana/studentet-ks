/**
 * Regjistrimi i ri i studentit, nga formulari te llogaria e hapur.
 *
 *   1  formulari: emri, mbiemri, data e lindjes (16+), emaili studentor, password-i
 *   2  kodi i emailit: i gabuari refuzohet, i sakti kalon
 *   3  fotoja e ID-së: ngarkohet private dhe dërgohet për verifikim
 *   4  profili: institucioni vjen nga emaili, pa hapin e zgjedhjes
 *   5  llogaria vetëm shikon: shiriti, butonat dhe roja e serverit
 *   6  moderimi e sheh foton, e miraton, dhe llogaria hapet me njoftim
 *
 * Kodi lexohet nga faqja, sepse lokalisht `.env` ka `MAIL_DEV_CODE=1` dhe nuk ka
 * ofrues emaili. Krijon llogari prove, prandaj pas tij lësho `npm run db:seed`.
 */

import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PASSWORD = "Provoje123!";
const db = new PrismaClient();
const stamp = Date.now().toString(36);
const EMAIL = `prove.regjistrimi.${stamp}@student.uni-pr.edu`;

/** PNG 1x1: sa të provojë rrugën e vërtetë të ngarkimit pa skedar të madh. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`  ${ok ? "OK  " : "DESH"} ${label}${ok || !detail ? "" : `  (${detail})`}`);
  if (!ok) failures += 1;
}

const browser = await chromium.launch();
const errors = [];
const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "sq" });
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));

async function screen() {
  return page.locator("[data-auth-screen]").first().getAttribute("data-auth-screen").catch(() => null);
}

console.log("\n1. Formulari");
await page.goto(`${BASE}/regjistrohu`, { waitUntil: "networkidle" });
await page.click("[data-email-signup]");
await page.waitForSelector('[data-auth-screen="register"]');
check("hapet formulari i ri", (await screen()) === "register");

await page.fill("#reg-first", "Provë");
await page.fill("#reg-last", "Regjistrimi");
const young = new Date();
young.setFullYear(young.getFullYear() - 15);
await page.fill("#reg-birth", young.toISOString().slice(0, 10));
check("nën 16 vjeç: thuhet menjëherë", (await page.getByText("Studentët.KS është për studentë nga 16 vjeç.").count()) === 1);
await page.fill("#reg-birth", "2004-05-12");

await page.fill("#reg-email", "prove@gmail.com");
check("Gmail nuk pranohet", (await page.locator('[data-student-email="unknown"]').count()) === 1);
await page.fill("#reg-email", "prove@universum-ks.org");
check("institucioni ende jashtë katalogut e thotë emrin", (await page.getByText("Kolegji Universum nuk është ende").count()) === 1);
await page.fill("#reg-email", EMAIL);
check("emaili studentor njeh UP-në", (await page.locator('[data-student-email="up"]').count()) === 1);

await page.fill("#reg-password", PASSWORD);
await page.fill("#reg-confirm", PASSWORD);
check("pa pranuar kushtet, «Vazhdo» rri i mbyllur", await page.locator("[data-register-submit]").isDisabled());
await page.check("[data-register-terms]");
await page.click("[data-register-submit]");
await page.waitForSelector('[data-auth-screen="code"]', { timeout: 30000 }).catch(() => {});
check("pas formularit vjen kodi", (await screen()) === "code", page.url());

const user = await db.user.findUnique({
  where: { email: EMAIL },
  select: { id: true, birthDate: true, awaitingReview: true, emailVerified: true, studentEmail: true, firstName: true },
});
check("llogaria u krijua me datën e lindjes", Boolean(user?.birthDate) && user?.firstName === "Provë");
check("llogaria e re pret shqyrtimin", user?.awaitingReview === true);
check("emaili nuk quhet i provuar para kodit", user?.emailVerified === null && user?.studentEmail === null);

console.log("\n2. Kodi");
const code = await page.locator("[data-dev-code]").getAttribute("data-dev-code").catch(() => null);
check("lokalisht kodi del te faqja", /^\d{6}$/.test(code ?? ""), code ?? "asnjë");
check("ridërgimi pret", await page.locator("[data-code-resend]").isDisabled());
await page.fill("[data-code-input]", code === "000000" ? "111111" : "000000");
await page.waitForSelector('[data-auth-alert="error"]', { timeout: 10000 }).catch(() => {});
check("kodi i gabuar refuzohet", (await page.getByText("Kodi nuk është i saktë").count()) === 1);
await page.fill("[data-code-input]", code ?? "");
await page.waitForSelector('[data-auth-screen="id"]', { timeout: 20000 }).catch(() => {});
check("kodi i saktë çon te ID-ja", (await screen()) === "id");
const linked = await db.user.findUnique({ where: { id: user.id }, select: { studentEmail: true, emailVerified: true } });
check("emaili studentor u lidh", linked?.studentEmail === EMAIL && Boolean(linked?.emailVerified));

console.log("\n3. Fotoja e ID-së");
check("pa foto, «Dërgo» rri i mbyllur", await page.locator("[data-id-submit]").isDisabled());
await page.setInputFiles("[data-id-file]", { name: "id.png", mimeType: "image/png", buffer: PNG });
await page.waitForSelector('[data-id-preview="ready"]', { timeout: 30000 }).catch(() => {});
check("fotoja u ngarkua", (await page.locator('[data-id-preview="ready"]').count()) === 1);
await page.click("[data-id-submit]");
await page.waitForSelector("[data-faculty]", { timeout: 30000 }).catch(() => {});
const verification = await db.verification.findFirst({
  where: { userId: user.id },
  orderBy: { createdAt: "desc" },
  select: { id: true, status: true, idDocumentRef: true },
});
check("kërkesa hyn në radhë me foton", verification?.status === "pending" && Boolean(verification?.idDocumentRef));

// Fotoja e ID-së nuk hapet nga një student tjetër, as me lidhjen e saktë.
const other = await browser.newContext();
const otherPage = await other.newPage();
await otherPage.goto(`${BASE}/hyr`, { waitUntil: "networkidle" });
await otherPage.fill('input[name="email"]', "erza.krasniqi");
await otherPage.fill('input[name="password"]', "provoje123");
await otherPage.click("[data-login-submit]");
await otherPage.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 30000 });
const peek = await otherPage.request.get(`${BASE}${verification?.idDocumentRef}`);
check("një student tjetër nuk e hap foton e ID-së", peek.status() === 403, String(peek.status()));
await other.close();

console.log("\n4. Profili");
check("institucioni vjen nga emaili: fakultetet e UP-së dalin drejt", (await page.locator("[data-faculty]").count()) > 3);
check("hapi i zgjedhjes së institucionit nuk shfaqet", (await page.locator("[data-institution]").count()) === 0);
await page.click("[data-faculty] >> nth=0");
await page.waitForSelector("[data-program]", { timeout: 15000 });
await page.click("[data-program] >> nth=0");
await page.click('button:has-text("Vazhdo")');
await page.waitForSelector("[data-year]", { timeout: 15000 });
await page.click('[data-year="1"]');
await page.click('button:has-text("Vazhdo")');
await page.waitForSelector("#ob-bio", { timeout: 15000 });
await page.click('button:has-text("Hap llogarinë time")');
await page.waitForURL(/\/feed/, { timeout: 30000 }).catch(() => {});
check("llogaria në shqyrtim shkon drejt te ballina, jo te ndjekjet", page.url().includes("/feed"), page.url());

console.log("\n5. Vetëm shikon");
await page.waitForSelector("[data-review-bar]", { timeout: 15000 }).catch(() => {});
check("shiriti «Llogaria jote po shqyrtohet»", (await page.locator('[data-review-bar="pending"]').count()) === 1);
await page.goto(`${BASE}/feed`, { waitUntil: "networkidle" });
check("hapet te «Fakulteti im», jo te një listë bosh ndjekjesh", (await page.locator('[data-tab="fakulteti"][aria-current="page"]').count()) === 1);
// Fakulteti i zgjedhur mund të mos ketë postime; «Universiteti im» ka gjithmonë nga seed-i.
await page.goto(`${BASE}/feed?tab=universiteti`, { waitUntil: "networkidle" });
check("feed-i lexohet", (await page.locator("[data-post-id]").count()) > 0);
const likeButton = page.locator("[data-post-id] footer button[aria-pressed]").first();
check("pëlqimi është aty", (await likeButton.count()) === 1);
if ((await likeButton.count()) > 0) {
  await likeButton.click();
  await page.waitForTimeout(800);
  check("pëlqimi jep shpjegimin, jo pëlqim", (await page.getByText("Llogaria jote po shqyrtohet. Kur ekipi").count()) >= 1);
  check("zemra nuk ndizet", (await likeButton.getAttribute("aria-pressed")) === "false");
}
// Roja e serverit: edhe pa ndërfaqen, veprimi nuk kalon.
await page.goto(`${BASE}/feed?tab=universiteti`, { waitUntil: "networkidle" });
await page.locator("[data-post-id] footer button").nth(1).click().catch(() => {});
const reactions = await db.reaction.count({ where: { userId: user.id } });
check("asnjë pëlqim nuk u ruajt", reactions === 0);
await page.goto(`${BASE}/mireseerdhe`, { waitUntil: "networkidle" });
check("faqja e ndjekjeve e kthen te ballina", page.url().includes("/feed"), page.url());

console.log("\n6. Moderimi");
const admin = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const adminPage = await admin.newPage();
await adminPage.goto(`${BASE}/hyr`, { waitUntil: "networkidle" });
await adminPage.fill('input[name="email"]', "petrit.cana");
await adminPage.fill('input[name="password"]', "12341234");
await adminPage.click("[data-login-submit]");
await adminPage.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 30000 });
await adminPage.goto(`${BASE}/moderimi?tab=verifikimet`, { waitUntil: "networkidle" });
const card = adminPage.locator("li", { hasText: "Provë Regjistrimi" }).first();
check("kërkesa del te radha", (await card.count()) === 1);
const photo = card.locator("[data-review-id-photo] img");
const loaded = (await photo.count()) === 1 && (await photo.evaluate((img) => img.complete && img.naturalWidth > 0));
check("moderatori e sheh foton e ID-së", loaded);
check("emaili studentor del te karta", (await card.getByText(EMAIL).count()) === 1);
await card.locator('button:has-text("Mirato")').click();
await adminPage.waitForTimeout(2000);

const approved = await db.user.findUnique({
  where: { id: user.id },
  select: { awaitingReview: true, isVerified: true, verification: true },
});
check("miratimi e hap llogarinë dhe jep shenjën", approved?.awaitingReview === false && approved?.isVerified === true);
const asset = verification?.idDocumentRef?.replace("/api/media/", "");
check("fotoja fshihet pas vendimit", (await db.mediaAsset.count({ where: { id: asset } })) === 0);
const note = await db.notification.findFirst({ where: { userId: user.id, type: "verification_approved" } });
check("studenti merr njoftim", Boolean(note));
await admin.close();

await page.goto(`${BASE}/feed`, { waitUntil: "networkidle" });
check("shiriti ikën pas miratimit", (await page.locator("[data-review-bar]").count()) === 0);

check("asnjë gabim JavaScript", errors.length === 0, errors.join(" | "));

await browser.close();
await db.$disconnect();
console.log(failures === 0 ? "\nGjithçka kaloi." : `\n${failures} prova dështuan.`);
process.exit(failures === 0 ? 0 : 1);
