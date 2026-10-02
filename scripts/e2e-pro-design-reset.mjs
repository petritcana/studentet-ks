/**
 * Dizajni i profilit (Pro), rivendosja e password-it dhe kolona e mesazheve.
 *
 * Kalon: petrit.cana (Pro) zgjedh dizajnin «Perëndim» dhe ngjyrën e emrit nga
 * profili; një vizitor e sheh profilin me atë dizajn dhe atë ngjyrë; një llogari
 * pa Pro nuk e sheh fare butonin. Pastaj «Ke harruar password-in?» me Google:
 * butoni të çon te Google, pa konfirmimin e tij faqja mbetet e mbyllur, me të
 * studenti krijon password të ri dhe hyn me të. Në fund: «Bisedë e re» dhe kërkimi
 * te kolona e bisedave.
 *
 * Krijon të dhëna prove, prandaj pas tij `npm run db:seed`.
 */

import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const db = new PrismaClient();

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`  ${ok ? "OK  " : "DESH"} ${label}${ok || !detail ? "" : `  (${detail})`}`);
  if (!ok) failures += 1;
}

const browser = await chromium.launch();
const errors = [];

async function contextFor(username, password) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "sq" });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${username}: ${error.message}`));
  if (username) {
    await page.goto(`${BASE}/hyr`, { waitUntil: "networkidle" });
    await page.fill('input[name="email"]', username);
    await page.fill('input[name="password"]', password);
    await page.locator("[data-login-submit]").click();
    await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 45_000 });
  }
  return page;
}

const owner = await db.user.findUniqueOrThrow({ where: { username: "petrit.cana" } });
await db.user.update({ where: { id: owner.id }, data: { profileTheme: null, nameColor: null } });

console.log("Dizajni i profilit:");
const admin = await contextFor("petrit.cana", "12341234");
await admin.goto(`${BASE}/une`, { waitUntil: "networkidle" });
check("Pro e sheh butonin e dizajnit", (await admin.locator("[data-profile-design]").count()) === 1);
await admin.locator("[data-profile-design]").click();
await admin.locator("[data-profile-design-dialog]").waitFor();
check("pesë dizajne dhe «Pa dizajn»", (await admin.locator("[data-theme-option]").count()) === 6);
await admin.locator('[data-theme-option="sunset"]').click();
await admin.locator('[data-name-color="#fdba74"]').click();
const preview = await admin.locator("[data-design-preview-name]").evaluate((node) => getComputedStyle(node).color);
check("pamja paraprake merr ngjyrën", preview === "rgb(253, 186, 116)", preview);
await admin.locator("[data-profile-design-save]").click();
await admin.waitForTimeout(2000);
const saved = await db.user.findUniqueOrThrow({ where: { id: owner.id }, select: { profileTheme: true, nameColor: true } });
check("dizajni dhe ngjyra u ruajtën", saved.profileTheme === "sunset" && saved.nameColor === "#fdba74", JSON.stringify(saved));

const visitor = await contextFor("dea.morina", "provoje123");
await visitor.goto(`${BASE}/u/petrit.cana`, { waitUntil: "networkidle" });
check("vizitori sheh profilin me dizajn", (await visitor.locator('[data-profile-theme="sunset"]').count()) >= 1);
const nameColor = await visitor.locator("[data-profile-name]").evaluate((node) => getComputedStyle(node).color);
check("emri del me ngjyrën e zgjedhur", nameColor === "rgb(253, 186, 116)", nameColor);
const cover = await visitor.locator("[data-profile-cover]").evaluate((node) => getComputedStyle(node).backgroundImage);
check("kopertina e dizajnit", cover.includes("linear-gradient"), cover.slice(0, 60));
check("vizitori nuk ka butonin e dizajnit", (await visitor.locator("[data-profile-design]").count()) === 0);

// Një llogari pa Pro.
const free = await db.user.findFirst({ where: { demoLabel: "free-verified" }, select: { username: true } });
if (free) {
  const freePage = await contextFor(free.username, "provoje123");
  await freePage.goto(`${BASE}/une`, { waitUntil: "networkidle" });
  check("pa Pro nuk ka dizajn fare", (await freePage.locator("[data-profile-design]").count()) === 0);
  await freePage.context().close();
}

console.log("\nPassword-i i harruar, me Google:");
const student = await db.user.findUniqueOrThrow({ where: { username: "erza.krasniqi" } });
const guestContext = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "sq" });
const guest = await guestContext.newPage();
guest.on("pageerror", (error) => errors.push(`guest: ${error.message}`));
let googleUrl = null;
await guest.route("https://accounts.google.com/**", (route) => {
  googleUrl = route.request().url();
  return route.abort();
});
await guest.goto(`${BASE}/harrova-password`, { waitUntil: "networkidle" });
check("«Vazhdo me Google» është rruga kryesore", (await guest.locator("[data-google-button]").count()) === 1);
// Lidhja me email del vetëm kur `.env` ka ofrues (SMTP ose Resend), si te `mailIsLive()`.
const mailLive = /^(RESEND_API_KEY="?[^"\s]+|MAIL_HOST="?[^"\s]+)/m.test(readFileSync(".env", "utf8"));
check(
  mailLive ? "me email të lidhur, del edhe formulari i lidhjes" : "pa email të lidhur, asnjë formular lidhjeje",
  (await guest.locator("[data-forgot-submit]").count()) === (mailLive ? 1 : 0),
);
await guest.locator("[data-google-button]").click();
await guest.waitForTimeout(4000);
check("të çon te Google, me zgjedhjen e llogarisë", Boolean(googleUrl) && googleUrl.includes("prompt=select_account") && decodeURIComponent(googleUrl).includes("/api/auth/callback/google"), googleUrl ?? "asnjë");
check("qëllimi ruhet për kthimin", (await guestContext.cookies()).some((cookie) => cookie.name === "sks_pw_reset_intent" && cookie.httpOnly));

await guest.goto(`${BASE}/harrova-password?gabim=pa-llogari`, { waitUntil: "networkidle" });
check("email pa llogari: shpjegim, jo llogari e re", (await guest.getByText("Ky email nuk ka llogari këtu.").count()) === 1);

// Studenti hyn (si pas Google-it) por pa lejen e Google-it: faqja mbetet e mbyllur.
await guest.goto(`${BASE}/hyr`, { waitUntil: "networkidle" });
await guest.fill('input[name="email"]', "erza.krasniqi");
await guest.fill('input[name="password"]', "provoje123");
await guest.locator("[data-login-submit]").click();
await guest.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 30_000 });
await guest.goto(`${BASE}/harrova-password/i-ri`, { waitUntil: "networkidle" });
check("pa konfirmim nga Google, s'ka password të ri", (await guest.locator('[data-auth-screen="reset-expired"]').count()) === 1);

// Leja që lëshon `lib/auth.ts` pasi Google e konfirmon, me të njëjtin sekret si serveri.
const secret = readFileSync(".env", "utf8").match(/^AUTH_SECRET="?([^"\n]+)"?/m)[1];
const payload = `${student.id}.${Date.now() + 10 * 60_000}`;
const signature = createHmac("sha256", secret).update(`password-reset:${payload}`).digest("hex");
await guestContext.addCookies([{ name: "sks_pw_reset_pass", value: `${payload}.${signature}`, url: BASE, httpOnly: true }]);
await guest.goto(`${BASE}/harrova-password/i-ri`, { waitUntil: "networkidle" });
check("pas Google-it: «Krijo password të ri»", (await guest.locator('[data-auth-screen="reset"]').count()) === 1);
check("fushat: password-i i ri dhe përsëritja", (await guest.getByText("Password-i i ri", { exact: true }).count()) === 1 && (await guest.getByText("Përsërit password-in e ri").count()) === 1);
await guest.fill("#reset-password", "Provoje123!");
await guest.fill("#reset-confirm", "Provoje123!");
await guest.locator("[data-reset-submit]").click();
await guest.locator('[data-auth-screen="reset-done"]').waitFor({ timeout: 10_000 }).catch(() => {});
check("password-i i ri u ruajt", (await guest.locator('[data-auth-screen="reset-done"]').count()) === 1);
await guest.locator("[data-reset-login]").click();
await guest.waitForURL((url) => url.pathname.startsWith("/feed"), { timeout: 20_000 }).catch(() => {});
check("vazhdon drejt te platforma", guest.url().includes("/feed"), guest.url());
await guest.goto(`${BASE}/harrova-password/i-ri`, { waitUntil: "networkidle" });
check("leja nuk vlen dy herë", (await guest.locator('[data-auth-screen="reset-expired"]').count()) === 1);

const fresh = await browser.newPage();
await fresh.goto(`${BASE}/hyr`, { waitUntil: "networkidle" });
await fresh.fill('input[name="email"]', "erza.krasniqi");
await fresh.fill('input[name="password"]', "Provoje123!");
await fresh.locator("[data-login-submit]").click();
await fresh.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 30_000 }).catch(() => {});
check("hyn me password-in e ri", !fresh.url().includes("/hyr"), fresh.url());
await fresh.close();
await db.user.update({ where: { id: student.id }, data: { passwordHash: await bcrypt.hash("provoje123", 10) } });

const adminResets = await admin.goto(`${BASE}/admin/fjalekalimet`, { waitUntil: "networkidle" });
check("adminët nuk kanë faqe me password ose lidhje", adminResets?.status() === 404);
await guestContext.close();

console.log("\nKolona e bisedave:");
await visitor.goto(`${BASE}/mesazhe`, { waitUntil: "networkidle" });
const column = visitor.locator("[data-messages-column]");
check("«Bisedë e re» te kolona", (await column.locator("[data-new-chat-compact]").count()) === 1);
const before = await column.locator("[data-conversation-list] li").count();
await column.locator("[data-conversation-search]").fill("zzzz-asnje");
check("kërkimi filtron bisedat", (await column.locator("[data-conversation-list] li").count()) === 0 && before > 0);
await column.locator("[data-conversation-search]").fill("");
await column.locator("[data-new-chat-compact]").click();
check("«Bisedë e re» hap kërkimin e njerëzve", (await visitor.getByRole("dialog").count()) === 1);
await visitor.keyboard.press("Escape");

console.log("\nReklama:");
await visitor.goto(`${BASE}/feed`, { waitUntil: "networkidle" });
const why = visitor.locator("[data-ad-why]").first();
if (await why.count()) {
  await why.click();
  check("«Pse e shoh?» hapet me prekje", (await visitor.locator("[data-ad-why-body]").count()) === 1);
} else {
  check("Dea është Pro: pa reklama", true);
}

await db.user.update({ where: { id: owner.id }, data: { profileTheme: null, nameColor: null } });
check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
if (errors.length) console.log(errors.join("\n"));
await browser.close();
await db.$disconnect();
console.log(failures === 0 ? "\nTë gjitha kontrollet kaluan." : `\n${failures} kontrolle dështuan.`);
process.exit(failures === 0 ? 0 : 1);
