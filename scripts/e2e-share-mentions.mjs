/**
 * Njoftimet tona nga admini, «Mundësi për ty», «Dërgo» dhe përmendjet.
 *
 * Kalon: petrit.cana (admin) e hap njoftimin nga karta, e ndryshon dhe i vë
 * foto; studenti nuk e sheh «Menaxho». «Mundësi për ty» i jep studentit të FIEK-ut
 * vetëm punë që i përkasin, dhe studentes së Mjekësisë të tjera. Dea e dërgon një
 * postim te një shoqe dhe karta del në bisedë. Te komenti, @ sugjeron njerëz,
 * përmendja njofton, #hashtag-u hap temën, dhe storja tregon përmendjet.
 *
 * Krijon të dhëna prove, prandaj pas tij `npm run db:seed`.
 */

import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = process.argv[2] ?? "http://localhost:3000";
const db = new PrismaClient();
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNk+M/wn4GBgYEJxAAAHvQD/0nCTdYAAAAASUVORK5CYII=",
  "base64",
);

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`  ${ok ? "OK  " : "DESH"} ${label}${ok || !detail ? "" : `  (${detail})`}`);
  if (!ok) failures += 1;
}

const browser = await chromium.launch();
const errors = [];
async function login(username, password = "provoje123") {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "sq" });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${username}: ${error.message}`));
  await page.goto(`${BASE}/hyr`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', username);
  await page.fill('input[name="password"]', password);
  await page.locator("[data-login-submit]").click();
  await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 45_000 });
  return page;
}

console.log("Njoftimet tona, nga admini:");
const admin = await login("petrit.cana", "12341234");
const dea = await login("dea.morina");
await admin.goto(`${BASE}/feed`, { waitUntil: "networkidle" });
check("admini sheh «Menaxho» te karta", (await admin.locator("[data-announcement-admin]").count()) === 1);
await dea.goto(`${BASE}/feed`, { waitUntil: "networkidle" });
check("studenti nuk e sheh", (await dea.locator("[data-announcement-admin]").count()) === 0);

const first = await db.announcement.findFirst({ where: { facultyId: null, isActive: true }, orderBy: [{ priority: "desc" }, { eventAt: "asc" }] });
await admin.locator("[data-announcement-board] li button, [data-announcement-board] li").first().click();
await admin.locator("[data-announcement-detail]").waitFor({ timeout: 8000 });
await admin.locator("[data-announcement-edit-link]").click();
await admin.waitForURL((url) => url.pathname === "/admin/njoftimet", { timeout: 15_000 });
const form = admin.locator('[data-announcement-form="edit"]');
await form.waitFor({ timeout: 8000 });
const newTitle = `Afati u zgjat deri të hënën ${Date.now().toString(36)}`;
await form.locator('[data-field="title"]').fill(newTitle);
await form.locator("[data-announcement-image-input]").setInputFiles({ name: "afishe.png", mimeType: "image/png", buffer: PNG });
await form.locator("[data-announcement-image]").waitFor({ timeout: 15_000 }).catch(() => {});
check("fotoja ngarkohet te formulari", (await form.locator("[data-announcement-image]").count()) === 1);
await form.locator("[data-announcement-save]").click();
await admin.waitForTimeout(2500);
const edited = await db.announcement.findFirst({ where: { title: newTitle } });
check("njoftimi u ndryshua me foto", Boolean(edited?.image?.startsWith("/api/media/")), JSON.stringify(edited?.image));
await admin.goto(`${BASE}/feed`, { waitUntil: "networkidle" });
await admin.getByText(newTitle).first().click();
await admin.locator("[data-announcement-photo]").waitFor({ timeout: 8000 }).catch(() => {});
check("studentët e shohin foton te dritarja", (await admin.locator("[data-announcement-photo]").count()) === 1);
await admin.keyboard.press("Escape");

const temp = await db.announcement.create({ data: { title: "Provë për fshirje", titleEn: "Delete test", body: "Tekst prove", bodyEn: "Test text", endsAt: new Date(Date.now() + 86_400_000) } });
await admin.goto(`${BASE}/admin/njoftimet`, { waitUntil: "networkidle" });
await admin.locator(`[data-announcement-delete="${temp.id}"]`).click();
await admin.locator(`[data-announcement-delete="${temp.id}"]`).click();
await admin.waitForTimeout(2000);
check("admini e fshin njoftimin", (await db.announcement.count({ where: { id: temp.id } })) === 0);
if (first) await db.announcement.update({ where: { id: first.id }, data: { title: first.title, image: first.image } });

console.log("\nMundësi për ty:");
async function sideFields(page) {
  const ids = await page.locator('a[href^="/karriera/"]').evaluateAll((links) => links.map((link) => link.getAttribute("href").split("/")[2]).filter(Boolean));
  const jobs = await db.jobPost.findMany({ where: { id: { in: ids } }, select: { field: true } });
  return jobs.map((job) => job.field);
}
await admin.goto(`${BASE}/feed`, { waitUntil: "networkidle" });
const techFields = await sideFields(admin);
check("FIEK: asnjë punë mjekësie", techFields.length > 0 && !techFields.includes("Shëndetësi"), techFields.join(", "));
const erza = await login("erza.krasniqi");
await erza.goto(`${BASE}/feed`, { waitUntil: "networkidle" });
const medFields = await sideFields(erza);
check("Mjekësia: asnjë punë teknologjie", medFields.length > 0 && !medFields.includes("Teknologji"), medFields.join(", "));

console.log("\nDërgo postimin:");
await dea.goto(`${BASE}/feed?tab=global`, { waitUntil: "networkidle" });
const card = dea.locator("[data-post-id]").first();
const postId = await card.getAttribute("data-post-id");
await card.locator("[data-post-send]").click();
await dea.locator("[data-share-dialog]").waitFor();
await dea.locator("[data-share-search]").fill("erza");
const erzaRow = dea.locator('[data-share-target^="u:"]').filter({ hasText: "@erza.krasniqi" }).first();
await erzaRow.waitFor({ timeout: 8000 });
await dea.waitForTimeout(600);
await erzaRow.click();
check("Erza zgjidhet", (await dea.locator('[data-share-target][aria-pressed="true"]').count()) === 1);
await dea.locator("[data-share-note]").fill("Shiko këtë!");
await dea.locator("[data-share-send]").click();
await dea.waitForTimeout(2500);
const deaUser = await db.user.findUniqueOrThrow({ where: { username: "dea.morina" } });
const shared = await db.message.findFirst({ where: { authorId: deaUser.id, postId }, orderBy: { createdAt: "desc" } });
check("postimi shkoi si mesazh me shënim", shared?.text === "Shiko këtë!" && shared.kind === "post_share", JSON.stringify(shared?.kind));
await dea.goto(`${BASE}/mesazhe/${shared?.conversationId}`, { waitUntil: "networkidle" });
check("karta e postimit del në bisedë", (await dea.locator(`[data-shared-post="${postId}"]`).count()) === 1);

console.log("\nPërmendjet dhe hashtag-ët:");
const erzaUser = await db.user.findUniqueOrThrow({ where: { username: "erza.krasniqi" } });
const target = await db.post.create({ data: { authorId: deaUser.id, type: "text", text: "Kush vjen nesër? #provimi", scope: "national" } });
await db.notification.deleteMany({ where: { userId: erzaUser.id, type: "mention" } });
await dea.goto(`${BASE}/postimi/${target.id}`, { waitUntil: "networkidle" });
const box = dea.getByPlaceholder("Shkruaj diçka që ndihmon.").first();
await box.click();
await box.pressSequentially("Pyet @erza.kr", { delay: 30 });
await dea.locator("[data-mention-suggest]").waitFor({ timeout: 8000 }).catch(() => {});
check("@ sugjeron njerëz", (await dea.locator('[data-mention-option="erza.krasniqi"]').count()) === 1);
await dea.locator('[data-mention-option="erza.krasniqi"]').click();
check("zgjedhja plotëson username-in", (await box.inputValue()).includes("@erza.krasniqi "), await box.inputValue());
await box.pressSequentially("për #provimi", { delay: 20 });
await box.press("Control+Enter");
await dea.waitForTimeout(2500);
check("e përmendura njoftohet", (await db.notification.count({ where: { userId: erzaUser.id, type: "mention", actorId: deaUser.id } })) === 1);
await dea.reload({ waitUntil: "networkidle" });
check("përmendja bëhet lidhje te profili", (await dea.locator('[data-mention="erza.krasniqi"]').count()) >= 1);
await dea.locator('[data-hashtag="provimi"]').first().click();
await dea.waitForURL((url) => url.pathname.startsWith("/hashtag/"), { timeout: 15_000 });
check("#hashtag-u hap temën", (await dea.locator("[data-hashtag-title]").innerText()).includes("#provimi"));
check("tema tregon postimin", (await dea.locator(`[data-post-id="${target.id}"]`).count()) === 1);

console.log("\nPërmendja te storja:");
await db.follow.upsert({
  where: { followerId_followingId: { followerId: deaUser.id, followingId: erzaUser.id } },
  create: { followerId: deaUser.id, followingId: erzaUser.id, status: "accepted" },
  update: { status: "accepted" },
});
await db.story.create({
  data: { authorId: erzaUser.id, kind: "image", mediaUrl: "/brand/logo-256.png", caption: "Me @dea.morina në bibliotekë", scope: "followers", expiresAt: new Date(Date.now() + 3_600_000) },
});
await dea.goto(`${BASE}/feed`, { waitUntil: "networkidle" });
await dea.getByRole("button", { name: /Hap stories e Erza/ }).first().click();
await dea.locator("[data-story-mentions]").waitFor({ timeout: 8000 }).catch(() => {});
check("storja tregon përmendjen si lidhje", (await dea.locator('[data-story-mention="dea.morina"]').count()) >= 1);

check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
if (errors.length) console.log(errors.join("\n"));
await browser.close();
await db.$disconnect();
console.log(failures === 0 ? "\nTë gjitha kontrollet kaluan." : `\n${failures} kontrolle dështuan.`);
process.exit(failures === 0 ? 0 : 1);
