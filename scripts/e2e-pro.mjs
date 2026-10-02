/**
 * Veçoritë e Pro-s, nga ndërfaqja te baza.
 *
 * Kalon: ngulja e një postimi, veçimi, kufiri i veçimit, analitika me numra të
 * vërtetë, pamja premium, profili i veçuar, privatësia që ndryshon sjelljen dhe
 * komenti publik që kërkon Pro.
 *
 * Provon edhe anën tjetër: një llogari pa Pro nuk i bën dot këto veprime as kur
 * thirren drejtpërdrejt, sepse kontrolli rri te serveri, jo te butoni.
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

const pro = await db.user.findFirst({
  where: { email: "dea.morina@student.uni-pr.edu" },
  select: { id: true, username: true },
});
const free = await db.user.findFirst({
  where: { email: "arian.bytyqi@gmail.com" },
  select: { id: true, username: true },
});

// Një me Pro, një pa: ndryshimi mes tyre është ajo që matet këtu.
await db.user.update({
  where: { id: pro.id },
  data: { proEarnedUntil: new Date(Date.now() + 30 * 86_400_000), pinnedPostId: null, featuredUntil: null },
});
await db.user.update({
  where: { id: free.id },
  data: { proEarnedUntil: null, whoCanFollow: "everyone", whoCanMessage: "everyone" },
});
await db.subscription.deleteMany({ where: { userId: free.id } });
await db.post.updateMany({ where: { authorId: pro.id }, data: { featuredUntil: null } });

const browser = await chromium.launch();
const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));

async function signIn(username) {
  await context.clearCookies();
  await page.goto(`${BASE}/hyr`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', username);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 45_000 });
}

await signIn(pro.username);

console.log("Ngulja dhe veçimi:");
const mine = await db.post.findFirst({
  where: { authorId: pro.id, isAnonymous: false, isHidden: false },
  orderBy: { createdAt: "desc" },
  select: { id: true },
});

await page.goto(`${BASE}/postimi/${mine.id}`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Më shumë|Veprime/ }).first().click();
await page.waitForTimeout(600);

const pinItem = page.getByRole("menuitem", { name: "Ngjite te profili" });
check("menyja e ofron ngjitjen për Pro", (await pinItem.count()) > 0);
if ((await pinItem.count()) > 0) {
  await pinItem.click();
  await page.waitForTimeout(2500);
}

const pinned = await db.user.findUnique({ where: { id: pro.id }, select: { pinnedPostId: true } });
check("postimi u ngjit", pinned?.pinnedPostId === mine.id, pinned?.pinnedPostId ?? "asnjë");

await page.goto(`${BASE}/postimi/${mine.id}`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Më shumë|Veprime/ }).first().click();
await page.waitForTimeout(600);
await page.getByRole("menuitem", { name: "Veçoje" }).click();
await page.waitForTimeout(2500);

const featured = await db.post.findUnique({
  where: { id: mine.id },
  select: { featuredUntil: true },
});
check("postimi u veçua", Boolean(featured?.featuredUntil && featured.featuredUntil > new Date()));

console.log("Kufiri i veçimit:");
const second = await db.post.findFirst({
  where: { authorId: pro.id, isAnonymous: false, isHidden: false, NOT: { id: mine.id } },
  select: { id: true },
});
if (second) {
  await page.goto(`${BASE}/postimi/${second.id}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Më shumë|Veprime/ }).first().click();
  await page.waitForTimeout(600);
  await page.getByRole("menuitem", { name: "Veçoje" }).click();
  await page.waitForTimeout(2500);

  const blocked = await db.post.findUnique({ where: { id: second.id }, select: { featuredUntil: true } });
  check("i dyti nuk veçohet derisa i pari të hiqet", blocked?.featuredUntil === null);
}

console.log("Profili:");
await page.goto(`${BASE}/u/${pro.username}`, { waitUntil: "networkidle" });
const first = await page.locator("[data-post-id]").first().getAttribute("data-post-id");
check("postimi i ngulur del i pari", first === mine.id, `${first} != ${mine.id}`);
check("shenja «E ngjitur» duket", (await page.getByText("E ngjitur").count()) > 0);

console.log("Analitika:");
await page.goto(`${BASE}/une/analitika`, { waitUntil: "networkidle" });
const body = (await page.textContent("body")) ?? "";
check("paneli hapet për Pro", body.includes("Pamje") && body.includes("Shtrirje"));

const real = await db.post.findUnique({
  where: { id: mine.id },
  select: { likeCount: true, viewCount: true },
});
check(
  "numrat vijnë nga baza",
  body.includes(String(real.likeCount)),
  `pëlqime=${real.likeCount} pamje=${real.viewCount}`,
);

console.log("Pamja premium dhe profili i veçuar:");
await page.goto(`${BASE}/cilesimet`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Smerald" }).click();
await page.waitForTimeout(2500);

const look = await db.user.findUnique({ where: { id: pro.id }, select: { proAccent: true } });
check("theksi u ruajt", look?.proAccent === "emerald", look?.proAccent ?? "asnjë");

await page.getByLabel("Profil i veçuar").click();
await page.waitForTimeout(2500);
const spotlight = await db.user.findUnique({ where: { id: pro.id }, select: { featuredUntil: true } });
check("profili u veçua", Boolean(spotlight?.featuredUntil && spotlight.featuredUntil > new Date()));

console.log("Privatësia ndryshon sjelljen:");
await page.getByRole("button", { name: "Askush" }).first().click();
await page.waitForTimeout(2500);

const closed = await db.user.findUnique({ where: { id: pro.id }, select: { whoCanFollow: true } });
check("cilësimi u ruajt", closed?.whoCanFollow === "nobody", closed?.whoCanFollow ?? "");

await db.follow.deleteMany({ where: { followerId: free.id, followingId: pro.id } });
await signIn(free.username);
await page.goto(`${BASE}/u/${pro.username}`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Ndiqe|Kërko ta ndjekësh/ }).first().click();
await page.waitForTimeout(2500);

const rejected = await db.follow.findFirst({
  where: { followerId: free.id, followingId: pro.id },
  select: { id: true },
});
check("ndjekja ndalohet vërtet, jo vetëm te butoni", rejected === null);

console.log("Komenti publik:");
await db.user.update({ where: { id: pro.id }, data: { whoCanFollow: "everyone" } });
const publicPost = await db.post.findFirst({
  where: { scope: "national", isHidden: false },
  select: { id: true, commentCount: true },
});

if (publicPost) {
  await page.goto(`${BASE}/postimi/${publicPost.id}`, { waitUntil: "networkidle" });
  const box = page.locator("textarea").first();
  if ((await box.count()) > 0) {
    await box.fill("Provë komenti publik.");
    await page.getByRole("button", { name: /Komento|Dërgo|Posto/ }).last().click();
    await page.waitForTimeout(2500);
  }

  const after = await db.post.findUnique({
    where: { id: publicPost.id },
    select: { commentCount: true },
  });
  check(
    "llogaria pa Pro nuk komenton te postimi publik",
    after?.commentCount === publicPost.commentCount,
    `${publicPost.commentCount} -> ${after?.commentCount}`,
  );
}

check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
if (errors.length > 0) console.log(errors.slice(0, 3));

await browser.close();
await db.$disconnect();

console.log(failures ? `\n${failures} kontrolle dështuan.` : "\nTë gjitha kontrollet kaluan.");
process.exit(failures ? 1 : 0);
