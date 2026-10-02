/**
 * Përgjigjet e komenteve, mesazhet e zërit dhe njoftimet e punëve.
 *
 * Tri rrugë që deri tani nuk ekzistonin fare: përgjigja rri nën komentin që
 * i përgjigjet dhe autori e mëson; zëri regjistrohet, ngarkohet dhe luhet te
 * tjetri; shpallja e re e adminit i njofton studentët që i përshtaten, dhe
 * vetëm ata.
 *
 * Krijon të dhëna prove, prandaj pas tij lësho `npm run db:seed`.
 */

import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PASSWORD = "provoje123";
const db = new PrismaClient();

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`  ${ok ? "OK  " : "DESH"} ${label}${ok || !detail ? "" : `  (${detail})`}`);
  if (!ok) failures += 1;
}

const dea = await db.user.findFirst({
  where: { email: "dea.morina@student.uni-pr.edu" },
  select: { id: true, username: true, facultyId: true, universityId: true },
});
const arian = await db.user.findFirst({
  where: { email: "arian.bytyqi@gmail.com" },
  select: { id: true, username: true },
});
const admin = await db.user.findFirst({ where: { role: "admin" }, select: { id: true, username: true } });

const browser = await chromium.launch({
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});
const errors = [];

async function login(username) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.grantPermissions(["microphone"], { origin: BASE });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${username}: ${error.message}`));
  await page.goto(`${BASE}/hyr`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', username);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 45_000 });
  return page;
}

/* ------------------------------------------------------------------ */
console.log("Përgjigjet e komenteve:");

const post = await db.post.create({
  data: {
    authorId: dea.id,
    type: "post",
    scope: "faculty",
    text: "Kush e ka provimin e Historisë së Artit të enjten?",
    facultyId: dea.facultyId,
    universityId: dea.universityId,
    commentCount: 1,
  },
  select: { id: true },
});
const parent = await db.comment.create({
  data: { postId: post.id, authorId: arian.id, text: "Unë, në orën 10 te salla 3." },
  select: { id: true },
});
await db.notification.deleteMany({ where: { userId: arian.id, type: "reply" } });

const page = await login(dea.username);
await page.goto(`${BASE}/postimi/${post.id}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);

await page.locator(`[data-comment="${parent.id}"]`).getByRole("button", { name: "Përgjigju" }).click();
await page.waitForTimeout(400);
const replyBox = page.getByPlaceholder("Shkruaj përgjigjen.");
check("kutia e përgjigjes u hap nën koment", (await replyBox.count()) === 1);

await replyBox.fill("Faleminderit, shihemi aty.");
await replyBox.press("Control+Enter");
await page.waitForTimeout(3500);

const reply = await db.comment.findFirst({
  where: { postId: post.id, authorId: dea.id },
  select: { id: true, parentId: true },
});
check("përgjigja u ruajt me prindin", reply?.parentId === parent.id, String(reply?.parentId));

const notified = await db.notification.count({ where: { userId: arian.id, type: "reply", targetId: post.id } });
check("autori i komentit u njoftua", notified === 1, String(notified));

const nested = await page.locator(`.border-l [data-comment="${reply?.id}"]`).count();
check("përgjigja rri nën komentin, jo si koment i ri", nested === 1);

const countBefore = (await db.post.findUnique({ where: { id: post.id }, select: { commentCount: true } })).commentCount;
check("numri i komenteve u rrit", countBefore === 2, String(countBefore));

console.log("Fshirja e komentit tënd:");
const own = page.locator(`[data-comment="${reply.id}"]`);
await own.getByRole("button", { name: "Fshije" }).click();
await own.getByRole("button", { name: "Po, fshije" }).click();
await page.waitForTimeout(3000);
check("përgjigja u fshi", (await db.comment.count({ where: { id: reply.id } })) === 0);
const countAfter = (await db.post.findUnique({ where: { id: post.id }, select: { commentCount: true } })).commentCount;
check("numri i komenteve u ul", countAfter === 1, String(countAfter));
check(
  "komenti i tjetrit nuk ka buton fshirjeje",
  (await page.locator(`[data-comment="${parent.id}"]`).getByRole("button", { name: "Fshije" }).count()) === 0,
);

/* ------------------------------------------------------------------ */
console.log("Mesazhi i zërit:");

const existing = await db.conversation.findFirst({
  where: {
    type: "direct",
    AND: [{ members: { some: { userId: dea.id } } }, { members: { some: { userId: arian.id } } }],
  },
  select: { id: true },
});
const conversation =
  existing ??
  (await db.conversation.create({
    data: { type: "direct", members: { create: [{ userId: dea.id }, { userId: arian.id }] } },
    select: { id: true },
  }));
await db.message.deleteMany({ where: { conversationId: conversation.id } });
await db.conversationMember.updateMany({
  where: { conversationId: conversation.id },
  data: { isAccepted: true, typingUntil: null },
});

await page.goto(`${BASE}/mesazhe/${conversation.id}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.locator("[data-voice-record]").click();
await page.waitForTimeout(300);
check("shiriti del menjëherë pas prekjes", (await page.locator("[data-voice-recording]").count()) === 1);
// Mikrofoni i rremë i shfletuesit të testit hapet me vonesë, si shpesh edhe i vërteti.
await page.locator('[data-phase="recording"]').waitFor({ timeout: 10_000 }).catch(() => {});
check("regjistrimi nisi", (await page.locator('[data-phase="recording"]').count()) === 1);
await page.waitForTimeout(2200);
await page.locator("[data-voice-send]").click();
await page.waitForTimeout(5000);

const voice = await db.message.findFirst({
  where: { conversationId: conversation.id, authorId: dea.id },
  select: { kind: true, media: true },
});
check("mesazhi u ruajt si zë", voice?.kind === "voice", String(voice?.kind));
const voiceMedia = JSON.parse(voice?.media ?? "[]")[0];
check("zëri ka skedar dhe kohëzgjatje", Boolean(voiceMedia?.id) && (voiceMedia?.durationMs ?? 0) >= 1000, JSON.stringify(voiceMedia));

const other = await login(arian.username);
await other.goto(`${BASE}/mesazhe/${conversation.id}`, { waitUntil: "domcontentloaded" });
await other.waitForTimeout(2500);
check("tjetri e sheh luajtësin e zërit", (await other.locator("[data-voice-player]").count()) === 1);

const partial = await other.request.get(`${BASE}/api/media/${voiceMedia.id}`, { headers: { range: "bytes=0-99" } });
check("skedari shërbehet me pjesë, si e do Safari", partial.status() === 206, String(partial.status()));

const outsider = await login(admin.username);
const blocked = await outsider.request.get(`${BASE}/api/media/${voiceMedia.id}`);
check("kush nuk është në bisedë nuk e hap zërin", blocked.status() === 403, String(blocked.status()));

/* ------------------------------------------------------------------ */
console.log("Zëri: ndalo, dëgjo, Enter:");

await page.locator("[data-voice-record]").click();
await page.locator('[data-phase="recording"]').waitFor({ timeout: 10_000 }).catch(() => {});
await page.waitForTimeout(1800);
await page.locator("[data-voice-stop]").click();
await page.locator("[data-voice-review]").waitFor({ timeout: 5000 }).catch(() => {});
check("pas ndalimit del dëgjimi, pa u dërguar", (await page.locator("[data-voice-review]").count()) === 1);
check("butoni i dëgjimit është aty", (await page.locator("[data-voice-review-play]").count()) === 1);
const beforeEnter = await db.message.count({ where: { conversationId: conversation.id, kind: "voice" } });
await page.keyboard.press("Enter");
await page.waitForTimeout(4000);
const afterEnter = await db.message.count({ where: { conversationId: conversation.id, kind: "voice" } });
check("Enter e dërgon zërin e ndalur", afterEnter === beforeEnter + 1, `${beforeEnter} -> ${afterEnter}`);

/* ------------------------------------------------------------------ */
console.log("Zëri në telefon: mbaje, lëshoje:");

await page.locator("[data-voice-record]").dispatchEvent("pointerdown", { pointerType: "touch", isPrimary: true, bubbles: true });
await page.locator('[data-phase="recording"]').waitFor({ timeout: 10_000 }).catch(() => {});
check("mbajtja e nis regjistrimin", (await page.locator("[data-voice-holding]").count()) === 1);
await page.waitForTimeout(1600);
await page.evaluate(() => window.dispatchEvent(new PointerEvent("pointerup", { pointerType: "touch", bubbles: true })));
await page.locator("[data-voice-review]").waitFor({ timeout: 5000 }).catch(() => {});
check("lëshimi e ndal dhe e lë për ta dëgjuar", (await page.locator("[data-voice-review]").count()) === 1);
await page.locator("[data-voice-discard]").click();

/* ------------------------------------------------------------------ */
console.log("Menyja «+» dhe skedarët:");

await page.locator("[data-attach-menu]").click();
await page.waitForTimeout(300);
check("menyja ka foto, kamerë dhe skedar; mikrofoni rri djathtas", (await page.locator("[data-attach]").count()) === 3 && (await page.locator("[data-voice-record]").count()) === 1);
await page.keyboard.press("Escape");

const pdf = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");
await page.locator("[data-document-input]").setInputFiles({ name: "Shenime Kolokviumi.pdf", mimeType: "application/pdf", buffer: pdf });
await page.locator('[data-attachment="file"]').waitFor({ timeout: 10_000 }).catch(() => {});
check("skedari del si kartë para dërgimit", (await page.locator('[data-attachment="file"]').count()) === 1);
await page.getByRole("button", { name: /Dërgo/ }).last().click();
await page.waitForTimeout(3500);

const fileMessage = await db.message.findFirst({
  where: { conversationId: conversation.id, authorId: dea.id, media: { contains: '"kind":"file"' } },
  select: { media: true },
});
const fileRef = JSON.parse(fileMessage?.media ?? "[]")[0];
check("mesazhi mban emrin e skedarit", fileRef?.name === "Shenime Kolokviumi.pdf" && fileRef?.extension === "pdf", JSON.stringify(fileRef));

await other.goto(`${BASE}/mesazhe/${conversation.id}`, { waitUntil: "domcontentloaded" });
await other.waitForTimeout(2500);
check("tjetri e sheh kartën e skedarit", (await other.locator("[data-file-card]").count()) >= 1);
const download = await other.request.get(`${BASE}/api/media/${fileRef?.id}`);
check(
  "skedari shkarkohet, nuk hapet në faqe",
  download.status() === 200 && (download.headers()["content-disposition"] ?? "").startsWith("attachment"),
  `${download.status()} ${download.headers()["content-disposition"]}`,
);
const fileOutsider = await outsider.request.get(`${BASE}/api/media/${fileRef?.id}`);
check("kush nuk është në bisedë nuk e shkarkon", fileOutsider.status() === 403, String(fileOutsider.status()));

// Një HTML i shpallur si PDF refuzohet: lloji njihet nga bajtat.
const fake = await page.evaluate(async () => {
  const form = new FormData();
  form.set("chunk", new Blob(["<html><script>alert(1)</script></html>"]));
  form.set("uploadId", "prove-html");
  form.set("index", "0");
  form.set("total", "1");
  form.set("mime", "application/pdf");
  form.set("surface", "message");
  form.set("name", "faqe.pdf");
  const response = await fetch("/api/ngarko", { method: "POST", body: form });
  return response.status;
});
check("HTML i maskuar si PDF refuzohet", fake === 415, String(fake));

/* ------------------------------------------------------------------ */
console.log("Njoftimet e punëve:");

await db.notification.deleteMany({ where: { type: "job_new" } });
await outsider.goto(`${BASE}/admin/punet`, { waitUntil: "domcontentloaded" });
await outsider.waitForTimeout(2000);

const title = `Praktikant në zhvillim web ${Date.now().toString(36)}`;
await outsider.fill("#job-title", title);
await outsider.selectOption("#job-field", "Teknologji");
await outsider.fill("#job-description", "Punë me React dhe Node për tre muaj, njëzet orë në javë.");
const future = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
await outsider.fill("#job-deadline", future);
await outsider.getByRole("button", { name: "Publiko punën" }).click();
await outsider.waitForTimeout(4000);

const job = await db.jobPost.findFirst({ where: { title }, select: { id: true } });
check("shpallja u publikua", Boolean(job));

const toArian = await db.notification.count({ where: { userId: arian.id, type: "job_new", targetId: job?.id } });
check("studenti i FIEK u njoftua", toArian === 1, String(toArian));

const toDea = await db.notification.count({ where: { userId: dea.id, type: "job_new", targetId: job?.id } });
check("studentja e Arteve nuk u njoftua", toDea === 0, String(toDea));

await other.goto(`${BASE}/feed`, { waitUntil: "domcontentloaded" });
await other.waitForTimeout(2000);
const feed = await other.request.get(`${BASE}/api/njoftimet`);
const body = await feed.json().catch(() => ({}));
const item = (body.items ?? []).find((row) => row.type === "job_new");
check("njoftimi të çon te puna", item?.href === `/karriera/${job?.id}`, String(item?.href));

check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
if (errors.length > 0) console.log(errors.slice(0, 3));

await browser.close();
await db.$disconnect();

console.log(failures ? `\n${failures} kontrolle dështuan.` : "\nTë gjitha kontrollet kaluan.");
process.exit(failures ? 1 : 0);
