/**
 * Mjetet e adminit për testimin: llogaria e pronarit, «Jep Pro» me orë, dhe
 * butoni «Raporto» që i shkon adminit.
 *
 * petrit.cana hyn si admin me Pro; i jep Erzës Pro për 48 orë dhe ajo e merr
 * menjëherë dhe me njoftim; Erza dërgon një raport nga ballina; admini e sheh
 * te `/admin/testimi` me faqen dhe pajisjen, dhe e shënon të zgjidhur. Në fund
 * Pro-ja ndalet. Krijon të dhëna prove: pas tij `npm run db:seed`.
 */

import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = process.argv[2] ?? "http://localhost:3000";
const db = new PrismaClient();

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`  ${ok ? "OK  " : "DESH"} ${label}${ok || !detail ? "" : `  (${detail})`}`);
  if (!ok) failures += 1;
}

const browser = await chromium.launch();
const errors = [];

async function signIn(identifier, password) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "sq" });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${BASE}/hyr`);
  await page.fill('input[name="email"]', identifier);
  await page.fill('input[name="password"]', password);
  await page.locator("[data-login-submit]").click();
  await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 30000 });
  return page;
}

const erza = await db.user.findUniqueOrThrow({ where: { username: "erza.krasniqi" } });
await db.user.update({ where: { id: erza.id }, data: { proEarnedUntil: null } });
await db.proGrant.deleteMany({ where: { userId: erza.id } });

console.log("Llogaria e pronarit:");
const admin = await signIn("petrit.cana", "12341234");
check("petrit.cana hyn me 12341234", !admin.url().includes("/hyr"), admin.url());
await admin.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
check("hap panelin e adminit", admin.url().endsWith("/admin"), admin.url());
check("paneli ka «Raportet e testuesve» dhe «Jep Pro»", (await admin.getByRole("link", { name: /Raportet e testuesve/ }).count()) === 1 && (await admin.getByRole("link", { name: "Jep Pro" }).count()) === 1);
const owner = await db.user.findUniqueOrThrow({ where: { username: "petrit.cana" } });
check("është admin me Pro dhe i verifikuar", owner.role === "admin" && owner.isVerified && owner.proEarnedUntil > new Date());

console.log("\nJep Pro me orë:");
await admin.goto(`${BASE}/admin/pro`, { waitUntil: "networkidle" });
await admin.locator("[data-pro-search]").fill("erza");
await admin.locator('[data-pro-candidate="erza.krasniqi"]').click();
await admin.locator("[data-pro-hours]").fill("48");
check("48 orë shpjegohen si 2 ditë", (await admin.getByText("48 orë = 2 ditë").count()) === 1);
const before = Date.now();
await admin.locator("[data-pro-give]").click();
await admin.locator('[data-pro-active-user="erza.krasniqi"]').waitFor({ timeout: 10000 });
const after = await db.user.findUniqueOrThrow({ where: { id: erza.id }, select: { proEarnedUntil: true } });
const hours = (after.proEarnedUntil.getTime() - before) / 3_600_000;
check("Erza e ka Pro-në për 48 orë", hours > 47.9 && hours < 48.2, hours.toFixed(2));
check("dhurata shkruhet në histori", (await db.proGrant.count({ where: { userId: erza.id, hours: 48 } })) === 1);
check("Erza merr njoftim", (await db.notification.count({ where: { userId: erza.id, type: "pro_granted" } })) >= 1);

const student = await signIn("erza.krasniqi", "provoje123");
await student.goto(`${BASE}/une/pro`, { waitUntil: "networkidle" });
check("Erza e sheh veten me Pro", (await student.locator("text=PRO").count()) > 0);

console.log("\nRaporto:");
await student.goto(`${BASE}/feed`, { waitUntil: "networkidle" });
await student.locator("[data-feedback-open]").click();
await student.locator("[data-feedback-dialog]").waitFor();
check("dritarja ka problem dhe sugjerim", (await student.locator("[data-feedback-kind]").count()) === 2);
check("faqja dhe pajisja shtohen vetë", (await student.locator("[data-feedback-auto]").innerText()).includes("/feed"));
const text = `Provë: butoni «Krijo» nuk u hap herën e parë (${Date.now().toString(36)}).`;
await student.locator("[data-feedback-message]").fill(text);
await student.locator("[data-feedback-send]").click();
await student.waitForTimeout(2500);
const report = await db.feedback.findFirst({ where: { message: text }, select: { id: true, path: true, device: true, kind: true } });
check("raporti u ruajt me faqen dhe pajisjen", report?.path === "/feed" && report.kind === "bug" && JSON.parse(report.device).browser === "Chrome", JSON.stringify(report));
check("adminët marrin njoftim", (await db.notification.count({ where: { userId: owner.id, type: "feedback_new", targetId: report?.id } })) === 1);

await admin.goto(`${BASE}/admin/testimi`, { waitUntil: "networkidle" });
const card = admin.locator(`[data-feedback-item="${report?.id}"]`);
check("admini e sheh raportin te «Të reja»", (await card.count()) === 1 && (await card.innerText()).includes(text));
await card.locator("[data-feedback-resolve]").click();
await admin.waitForTimeout(2000);
check("admini e shënon të zgjidhur", (await db.feedback.findUnique({ where: { id: report.id }, select: { status: true } })).status === "resolved");

console.log("\n«Jep Pro» te profili:");
const dea = await db.user.findUniqueOrThrow({ where: { username: "dea.morina" } });
await db.user.update({ where: { id: dea.id }, data: { proEarnedUntil: null } });
await student.goto(`${BASE}/u/dea.morina`, { waitUntil: "networkidle" });
check("studenti nuk e sheh butonin", (await student.locator("[data-profile-give-pro]").count()) === 0);
await admin.goto(`${BASE}/u/dea.morina`, { waitUntil: "networkidle" });
check("admini e sheh butonin te profili", (await admin.locator("[data-profile-give-pro]").count()) === 1);
await admin.locator("[data-profile-give-pro]").click();
await admin.locator("[data-profile-pro-dialog]").waitFor();
await admin.locator("[data-profile-pro-hours]").fill("24");
const beforeDea = Date.now();
await admin.locator("[data-profile-pro-give]").click();
await admin.waitForTimeout(2500);
const deaAfter = await db.user.findUniqueOrThrow({ where: { id: dea.id }, select: { proEarnedUntil: true } });
const deaHours = deaAfter.proEarnedUntil ? (deaAfter.proEarnedUntil.getTime() - beforeDea) / 3_600_000 : 0;
check("Dea e mori Pro-në për 24 orë nga profili", deaHours > 23.9 && deaHours < 24.2, deaHours.toFixed(2));
await admin.reload({ waitUntil: "networkidle" });
await admin.locator("[data-profile-give-pro]").click();
check("dritarja tregon deri kur e ka", (await admin.locator("[data-profile-pro-dialog]").innerText()).includes("e ka Pro-në deri më"));
await admin.locator("[data-profile-stop-pro]").click();
await admin.waitForTimeout(2000);
check("Pro-ja ndalet edhe nga profili", (await db.user.findUniqueOrThrow({ where: { id: dea.id }, select: { proEarnedUntil: true } })).proEarnedUntil <= new Date());

console.log("\nNdalja e Pro-së:");
await admin.goto(`${BASE}/admin/pro`, { waitUntil: "networkidle" });
const row = admin.locator('[data-pro-active-user="erza.krasniqi"]');
await row.locator("[data-pro-revoke]").click();
await row.locator("[data-pro-revoke-confirm]").click();
await admin.waitForTimeout(2000);
const stopped = await db.user.findUniqueOrThrow({ where: { id: erza.id }, select: { proEarnedUntil: true } });
check("Pro-ja e Erzës u ndal", stopped.proEarnedUntil <= new Date());

check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
if (errors.length) console.log(errors.join("\n"));

await browser.close();
await db.$disconnect();
console.log(failures === 0 ? "\nTë gjitha kontrollet kaluan." : `\n${failures} kontrolle dështuan.`);
process.exit(failures === 0 ? 0 : 1);
