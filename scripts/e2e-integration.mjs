/**
 * Integrimi, nga një modul te tjetri.
 *
 * Testet e tjera provojnë secilën veçori më vete. Ky ndjek katër rrugë që kalojnë
 * nëpër disa module njëherësh, sepse aty prishen gjërat kur ndryshon një pjesë:
 *
 *   1. Kërkesa për ndjekje, pranimi, pastaj feed-i.
 *   2. Pro, pastaj postimi publik, pastaj komenti, pastaj analitika.
 *   3. Profili i karrierës, pastaj personalizimi, pastaj njoftimi i punës.
 *   4. Asistenti: kufiri i planit falas dhe hapësira e Pro-s.
 *
 * Çdo hap bëhet nga ndërfaqja, si studenti. Baza lexohet vetëm për të vërtetuar.
 * Krijon të dhëna prove, prandaj pas tij lësho `npm run db:seed`.
 */

import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PASSWORD = "provoje123";
const db = new PrismaClient();
const stamp = Date.now().toString(36);

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`  ${ok ? "OK  " : "DESH"} ${label}${ok || !detail ? "" : `  (${detail})`}`);
  if (!ok) failures += 1;
}

const author = await db.user.findFirst({
  where: { email: "dea.morina@student.uni-pr.edu" },
  select: { id: true, username: true },
});
const reader = await db.user.findFirst({
  where: { email: "arian.bytyqi@gmail.com" },
  select: { id: true, username: true },
});
const admin = await db.user.findFirst({ where: { role: "admin" }, select: { id: true, username: true } });

// Autorja ka Pro, lexuesi jo. Profili i autores është publik, por ndjekja nis prapë si kërkesë.
await db.user.update({
  where: { id: author.id },
  data: {
    proEarnedUntil: new Date(Date.now() + 30 * 86_400_000),
    isPrivate: false,
    whoCanFollow: "everyone",
    autoAcceptFollows: false,
  },
});
await db.user.update({ where: { id: reader.id }, data: { proEarnedUntil: null } });
await db.subscription.deleteMany({ where: { userId: reader.id } });
await db.follow.deleteMany({ where: { followerId: reader.id, followingId: author.id } });
await db.notification.deleteMany({ where: { userId: { in: [author.id, reader.id] } } });

const browser = await chromium.launch();
const errors = [];

async function login(username) {
  const context = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${username} ${new URL(page.url()).pathname}: ${error.message}`));
  await page.goto(`${BASE}/hyr`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', username);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 45_000 });
  return page;
}

/** Shkruan një postim nga kompozuesi, me shtrirjen e dhënë. */
async function compose(page, text, scopeLabel) {
  await page.goto(`${BASE}/feed`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /Çfarë po ndodh|Posto/ }).first().click();
  await page.waitForTimeout(1000);
  const dialog = page.getByRole("dialog");
  await dialog.locator("textarea").first().fill(text);
  await dialog.locator("button[aria-expanded]").first().click();
  await page.waitForTimeout(300);
  // Shtrirja është listë vertikale me zgjedhje (radio).
  await dialog.getByRole("radio", { name: new RegExp(scopeLabel) }).first().click();
  await dialog.getByRole("button", { name: /^Posto$/ }).last().click();
  await page.waitForTimeout(3000);
  return db.post.findFirst({ where: { authorId: author.id, text }, select: { id: true, scope: true } });
}

const authorPage = await login(author.username);
const readerPage = await login(reader.username);

/* ------------------------------------------------------------------ */
console.log("1. Kërkesa, pranimi, feed-i:");

await readerPage.goto(`${BASE}/u/${author.username}`, { waitUntil: "domcontentloaded" });
await readerPage.waitForTimeout(2000);
await readerPage.locator("main").getByRole("button", { name: /^Ndiqe$|Kërko ta ndjekësh/ }).first().click();
await readerPage.waitForTimeout(2500);

// Ndjekja nis si kërkesë: autorja vendos kush e ndjek.
const request = await db.notification.count({
  where: { userId: author.id, type: "follow_request", actorId: reader.id },
});
check("autorja mori kërkesën për ndjekje", request === 1, String(request));

await authorPage.goto(`${BASE}/njoftimet?tab=kerkesa`, { waitUntil: "domcontentloaded" });
await authorPage.waitForTimeout(2000);
await authorPage.getByRole("button", { name: "Prano" }).first().click();
await authorPage.waitForTimeout(2500);

const follow = await db.follow.findFirst({
  where: { followerId: reader.id, followingId: author.id },
  select: { status: true },
});
check("pas pranimit ndjekja është e vërtetë", follow?.status === "accepted", String(follow?.status));

const followersText = `Vetëm për ndjekësit ${stamp}`;
const followersPost = await compose(authorPage, followersText, "Vetëm ndjekësit");
check("postimi për ndjekësit u ruajt me shtrirjen e duhur", followersPost?.scope === "followers", String(followersPost?.scope));

await readerPage.goto(`${BASE}/feed`, { waitUntil: "domcontentloaded" });
await readerPage.waitForTimeout(2500);
check("ndjekësi e sheh te «Duke ndjekur»", (await readerPage.getByText(followersText).count()) > 0);

/* ------------------------------------------------------------------ */
console.log("2. Pro, postimi publik, komenti, analitika:");

const publicText = `Për të gjithë Kosovën ${stamp}`;
const publicPost = await compose(authorPage, publicText, "Të gjithë studentët e Kosovës");
check("llogaria Pro poston për tërë Kosovën", publicPost?.scope === "national", String(publicPost?.scope));

// Lexuesi e sheh te skeda Kosova: aty numërohet edhe pamja.
await readerPage.goto(`${BASE}/feed?tab=global`, { waitUntil: "domcontentloaded" });
await readerPage.waitForTimeout(3500);
check("postimi publik del te skeda Kosova", (await readerPage.getByText(publicText).count()) > 0);

await readerPage.goto(`${BASE}/postimi/${publicPost.id}`, { waitUntil: "domcontentloaded" });
await readerPage.waitForTimeout(2000);
await readerPage.locator("textarea").first().fill("Koment pa Pro.");
await readerPage.getByRole("button", { name: "Dërgo" }).first().click();
await readerPage.waitForTimeout(2500);

const blocked = await db.comment.count({ where: { postId: publicPost.id } });
check("pa Pro komenti publik nuk kalon", blocked === 0, String(blocked));
check(
  "studenti e mëson pse, me tekst të qartë",
  (await readerPage.getByText("Komentimi te postimet publike vjen me Pro.").count()) > 0,
);

await db.user.update({
  where: { id: reader.id },
  data: { proEarnedUntil: new Date(Date.now() + 7 * 86_400_000) },
});
await readerPage.reload({ waitUntil: "domcontentloaded" });
await readerPage.waitForTimeout(2000);
await readerPage.locator("textarea").first().fill("Koment me Pro, faleminderit.");
await readerPage.getByRole("button", { name: "Dërgo" }).first().click();
await readerPage.waitForTimeout(3000);

const allowed = await db.comment.count({ where: { postId: publicPost.id } });
check("me Pro komenti publik kalon", allowed === 1, String(allowed));

const commentNote = await db.notification.count({
  where: { userId: author.id, type: "comment", targetId: publicPost.id },
});
check("autorja u njoftua për komentin", commentNote === 1, String(commentNote));

const counted = await db.post.findUnique({
  where: { id: publicPost.id },
  select: { viewCount: true, commentCount: true },
});
check("pamja u numërua", (counted?.viewCount ?? 0) >= 1, String(counted?.viewCount));

await authorPage.goto(`${BASE}/une/analitika`, { waitUntil: "domcontentloaded" });
await authorPage.waitForTimeout(2500);
const analytics = (await authorPage.textContent("main")) ?? "";
check("analitika e tregon postimin e ri", analytics.includes(publicText.slice(0, 20)));

await db.user.update({ where: { id: reader.id }, data: { proEarnedUntil: null } });

/* ------------------------------------------------------------------ */
console.log("3. Profili, personalizimi, punët:");

await readerPage.goto(`${BASE}/karriera/profili`, { waitUntil: "domcontentloaded" });
await readerPage.waitForTimeout(2000);
await readerPage.fill("#desiredRoles", "Marketing, Dizajn");
await readerPage.getByRole("button", { name: "Ruaj profilin" }).click();
await readerPage.waitForTimeout(2500);

const profile = await db.careerProfile.findUnique({ where: { userId: reader.id }, select: { desiredRoles: true } });
check("rolet e kërkuara u ruajtën", (profile?.desiredRoles ?? "").includes("Marketing"), profile?.desiredRoles);

const adminPage = await login(admin.username);
await adminPage.goto(`${BASE}/admin/punet`, { waitUntil: "domcontentloaded" });
await adminPage.waitForTimeout(2000);
const jobTitle = `Asistent marketingu ${stamp}`;
await adminPage.fill("#job-title", jobTitle);
await adminPage.selectOption("#job-field", "Marketing");
await adminPage.fill("#job-description", "Fushata në rrjete sociale për një startup, dhjetë orë në javë.");
await adminPage.fill("#job-deadline", new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10));
await adminPage.getByRole("button", { name: "Publiko punën" }).click();
await adminPage.waitForTimeout(4000);

const job = await db.jobPost.findFirst({ where: { title: jobTitle }, select: { id: true } });
check("puna u publikua", Boolean(job));

const jobNote = await db.notification.count({ where: { userId: reader.id, type: "job_new", targetId: job?.id } });
check("studenti i FIEK u njoftua sepse e kërkoi vetë rolin", jobNote === 1, String(jobNote));

await readerPage.goto(`${BASE}/karriera/${job?.id}`, { waitUntil: "domcontentloaded" });
await readerPage.waitForTimeout(1500);
check("njoftimi çon te një faqe pune e gjallë", (await readerPage.getByText(jobTitle).count()) > 0);

/* ------------------------------------------------------------------ */
console.log("4. Asistenti, falas dhe Pro:");

async function fillQuota(userId) {
  await db.aiMessage.deleteMany({ where: { conversation: { userId } } });
  await db.aiConversation.deleteMany({ where: { userId } });
  await db.aiConversation.create({
    data: {
      userId,
      title: "Kuota",
      messages: {
        create: Array.from({ length: 10 }, (_, index) => ({ role: "user", content: `Pyetja ${index + 1}` })),
      },
    },
  });
}

async function ask(page, userId, expectText = null) {
  await page.goto(`${BASE}/feed`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: "Hap asistentin" }).first().click();
  await page.waitForTimeout(1200);
  const box = page.locator("textarea").last();
  await box.fill("Si ta përgatis provimin e Statistikës për dy javë?");
  await box.press("Enter");
  // Njoftimi i kufirit rri disa sekonda: kapet kur del, jo pas pritjes.
  const seen = expectText
    ? await page.getByText(expectText).first().waitFor({ timeout: 8000 }).then(() => true, () => false)
    : null;
  await page.waitForTimeout(expectText ? 1500 : 6000);
  const count = await db.aiMessage.count({ where: { role: "user", conversation: { userId } } });
  return { count, seen };
}

await fillQuota(reader.id);
const free = await ask(readerPage, reader.id, "I ke përdorur të gjitha pyetjet e sotme.");
check("plani falas ndalet te 10 pyetje në ditë", free.count === 10, String(free.count));
check("kufiri thuhet hapur", free.seen === true);

await fillQuota(author.id);
const pro = await ask(authorPage, author.id);
check("Pro vazhdon pas pyetjes së dhjetë", pro.count === 11, String(pro.count));

check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
if (errors.length > 0) console.log(errors.slice(0, 3));

await browser.close();
await db.$disconnect();

console.log(failures ? `\n${failures} kontrolle dështuan.` : "\nTë gjitha kontrollet kaluan.");
process.exit(failures ? 1 : 0);
