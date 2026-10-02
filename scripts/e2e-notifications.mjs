/**
 * Njoftimet: pëlqimi, përmendja, grumbullimi dhe preferencat.
 *
 * Provon edhe anën që zakonisht harrohet: kur një kategori fiket, njoftimi nuk
 * shkruhet fare, jo thjesht nuk shfaqet.
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

const author = await db.user.findFirst({
  where: { email: "dea.morina@student.uni-pr.edu" },
  select: { id: true, username: true },
});
const actor = await db.user.findFirst({
  where: { email: "arian.bytyqi@gmail.com" },
  select: { id: true, username: true },
});

const post = await db.post.findFirst({
  where: { authorId: author.id, isAnonymous: false, isHidden: false, scope: { not: "national" } },
  orderBy: { createdAt: "desc" },
  select: { id: true },
});

await db.notification.deleteMany({ where: { userId: author.id, actorId: actor.id } });
await db.reaction.deleteMany({ where: { postId: post.id, userId: actor.id } });
await db.notificationSetting.deleteMany({ where: { userId: author.id } });

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

console.log("Pëlqimi:");
await signIn(actor.username);
await page.goto(`${BASE}/postimi/${post.id}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.getByRole("button", { name: /Pëlqe/ }).first().click();
await page.waitForTimeout(2500);

const liked = await db.notification.findFirst({
  where: { userId: author.id, type: "reaction", actorId: actor.id },
  select: { id: true, groupKey: true },
});
check("pëlqimi krijon njoftim", Boolean(liked), liked?.groupKey ?? "asnjë");

console.log("Grumbullimi:");
const third = await db.user.findFirst({
  where: { email: "endrit.rexhepi@student.uni-pr.edu" },
  select: { id: true, username: true },
});

if (third) {
  await db.reaction.deleteMany({ where: { postId: post.id, userId: third.id } });
  await signIn(third.username);
  await page.goto(`${BASE}/postimi/${post.id}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: /Pëlqe/ }).first().click();
  await page.waitForTimeout(2500);

  const rows = await db.notification.count({
    where: { userId: author.id, type: "reaction", groupKey: `reaction:${post.id}` },
  });
  check("dy pëlqime te i njëjti postim janë një rresht", rows === 1, String(rows));
}

console.log("Përmendja:");
await signIn(actor.username);
await page.goto(`${BASE}/postimi/${post.id}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);

const box = page.locator("textarea").first();
if ((await box.count()) > 0) {
  await box.fill(`Përshëndetje @${author.username}, shiko këtë.`);
  await page.getByRole("button", { name: /Komento|Dërgo|Posto/ }).last().click();
  await page.waitForTimeout(3000);
}

const mention = await db.notification.findFirst({
  where: { userId: author.id, type: "mention", actorId: actor.id },
  select: { id: true },
});
check("përmendja krijon njoftim", Boolean(mention));

console.log("Preferencat:");
await db.notification.deleteMany({ where: { userId: author.id, type: "reaction" } });
await db.reaction.deleteMany({ where: { postId: post.id, userId: actor.id } });

await signIn(author.username);
await page.goto(`${BASE}/cilesimet`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.locator("#notif-social").click();
await page.waitForTimeout(2500);

const pref = await db.notificationSetting.findFirst({
  where: { userId: author.id, category: "social" },
  select: { inApp: true },
});
check("cilësimi u ruajt", pref?.inApp === false, String(pref?.inApp));

await signIn(actor.username);
await page.goto(`${BASE}/postimi/${post.id}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.getByRole("button", { name: /Pëlqe/ }).first().click();
await page.waitForTimeout(2500);

const suppressed = await db.notification.count({
  where: { userId: author.id, type: "reaction" },
});
check("kategoria e fikur nuk shkruan njoftim", suppressed === 0, String(suppressed));

check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
if (errors.length > 0) console.log(errors.slice(0, 3));

await browser.close();
await db.notificationSetting.deleteMany({ where: { userId: author.id } });
await db.$disconnect();

console.log(failures ? `\n${failures} kontrolle dështuan.` : "\nTë gjitha kontrollet kaluan.");
process.exit(failures ? 1 : 0);
