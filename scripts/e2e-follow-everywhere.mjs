/**
 * Ndjekja dhe çndjekja, nga çdo vend ku shfaqet një profil.
 *
 * Kalon: butoni te profili, numri i ndjekësve që lëviz bashkë me të, çndjekja,
 * qëndrueshmëria pas rifreskimit dhe pas daljes e rihyrjes, tërheqja e një
 * kërkese te një profil privat, dhe butoni te kartat e njerëzve.
 *
 * Krijon lidhje prove, prandaj pas tij lësho `npm run db:seed`.
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

const me = await db.user.findFirst({
  where: { email: "arian.bytyqi@gmail.com" },
  select: { id: true, username: true },
});
const target = await db.user.findFirst({
  where: { email: "dea.morina@student.uni-pr.edu" },
  select: { id: true, username: true },
});

// Gjendje e pastër mes të dyve, dhe një profil publik që pranon drejt.
await db.follow.deleteMany({
  where: {
    OR: [
      { followerId: me.id, followingId: target.id },
      { followerId: target.id, followingId: me.id },
    ],
  },
});
await db.user.update({ where: { id: target.id }, data: { isPrivate: false, autoAcceptFollows: true } });

const browser = await chromium.launch();
const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));

async function signIn() {
  await page.goto(`${BASE}/hyr`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', me.username);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 45_000 });
}

/** Numri nën «Ndjekës» te koka e profilit. */
async function followerCount() {
  const text = await page.locator('a[href$="/ndjekesit"]').first().textContent();
  return Number((text ?? "").replace(/\D/g, ""));
}

await signIn();

console.log("Te profili:");
await page.goto(`${BASE}/u/${target.username}`, { waitUntil: "networkidle" });
const before = await followerCount();

await page.getByRole("button", { name: /Ndiqe|Kërko ta ndjekësh/ }).first().click();
await page.waitForTimeout(2500);

const after = await followerCount();
check("numri i ndjekësve u rrit menjëherë", after === before + 1, `${before} -> ${after}`);

const saved = await db.follow.findFirst({
  where: { followerId: me.id, followingId: target.id },
  select: { status: true },
});
check("ndjekja u ruajt", saved?.status === "accepted", saved?.status ?? "asnjë");

console.log("Pas rifreskimit:");
await page.reload({ waitUntil: "networkidle" });
check(
  "butoni mbetet «E ndjek»",
  (await page.getByRole("button", { name: /E ndjek|Shokë|Çndiqe/ }).count()) > 0,
);
check("numri qëndron", (await followerCount()) === before + 1);

console.log("Pas daljes dhe rihyrjes:");
await page.goto(`${BASE}/une`, { waitUntil: "networkidle" });
await context.clearCookies();
await signIn();
await page.goto(`${BASE}/u/${target.username}`, { waitUntil: "networkidle" });
check(
  "ndjekja mbetet pas rihyrjes",
  (await page.getByRole("button", { name: /E ndjek|Shokë|Çndiqe/ }).count()) > 0,
);

console.log("Çndjekja:");
const beforeUnfollow = await followerCount();
await page.getByRole("button", { name: /E ndjek|Shokë|Çndiqe/ }).first().click();
await page.waitForTimeout(2500);

check("numri u ul menjëherë", (await followerCount()) === beforeUnfollow - 1);
const gone = await db.follow.findFirst({
  where: { followerId: me.id, followingId: target.id },
  select: { id: true },
});
check("lidhja u fshi", gone === null);

await page.reload({ waitUntil: "networkidle" });
check("butoni u kthye te «Ndiqe»", (await page.getByRole("button", { name: /^Ndiqe$/ }).count()) > 0);

console.log("Kërkesa te një profil privat:");
await db.user.update({ where: { id: target.id }, data: { isPrivate: true, autoAcceptFollows: false } });
await page.reload({ waitUntil: "networkidle" });
await page.getByRole("button", { name: /Ndiqe|Kërko ta ndjekësh/ }).first().click();
await page.waitForTimeout(2500);

const pending = await db.follow.findFirst({
  where: { followerId: me.id, followingId: target.id },
  select: { status: true },
});
check("ndjekja nis si kërkesë", pending?.status === "pending", pending?.status ?? "asnjë");

await page.getByRole("button", { name: /Kërkesa u dërgua|Çndiqe/ }).first().click();
await page.waitForTimeout(2500);

const withdrawn = await db.follow.findFirst({
  where: { followerId: me.id, followingId: target.id },
  select: { id: true },
});
check("kërkesa tërhiqet me të njëjtin buton", withdrawn === null);

const notice = await db.notification.findFirst({
  where: { userId: target.id, type: "follow_request", actorId: me.id },
  select: { id: true },
});
check("njoftimi i kërkesës u hoq bashkë me të", notice === null);

console.log("Te kartat e njerëzve:");
await db.user.update({ where: { id: target.id }, data: { isPrivate: false, autoAcceptFollows: true } });
await page.goto(`${BASE}/komuniteti`, { waitUntil: "networkidle" });
const cards = page.getByRole("button", { name: /^Ndiqe$/ });
const count = await cards.count();
check("kartat kanë butonin e ndjekjes", count > 0, String(count));

if (count > 0) {
  const followsBefore = await db.follow.count({ where: { followerId: me.id } });
  await cards.first().click();
  await page.waitForTimeout(2500);
  const followsAfter = await db.follow.count({ where: { followerId: me.id } });
  check("ndjekja nga karta u ruajt", followsAfter === followsBefore + 1, `${followsBefore} -> ${followsAfter}`);
}

check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
if (errors.length > 0) console.log(errors.slice(0, 3));

await browser.close();
await db.$disconnect();

console.log(failures ? `\n${failures} kontrolle dështuan.` : "\nTë gjitha kontrollet kaluan.");
process.exit(failures ? 1 : 0);
