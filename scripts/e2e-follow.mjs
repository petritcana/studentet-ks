/**
 * Ndjekja me kërkesë, nga fillimi në fund.
 *
 * Kalon: kërkesa, skeda e kërkesave te njoftimet, pranimi, refuzimi dhe hyrja me
 * emër përdoruesi. Krijon lidhje prove, prandaj pas tij lësho `npm run db:seed`.
 */

import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PASSWORD = "provoje123";
const db = new PrismaClient();

let failures = 0;
function check(label, ok) {
  console.log(`  ${ok ? "OK  " : "DESH"} ${label}`);
  if (!ok) failures += 1;
}

const requester = await db.user.findFirst({ where: { email: "arian.bytyqi@gmail.com" }, select: { id: true, username: true } });
const owner = await db.user.findFirst({ where: { email: "dea.morina@student.uni-pr.edu" }, select: { id: true, username: true, name: true } });

// Gjendje e pastër: pa ndjekje dhe pa kërkesa mes të dyve.
await db.follow.deleteMany({
  where: {
    OR: [
      { followerId: requester.id, followingId: owner.id },
      { followerId: owner.id, followingId: requester.id },
    ],
  },
});
await db.notification.deleteMany({ where: { userId: owner.id, type: "follow_request", actorId: requester.id } });
await db.user.update({ where: { id: owner.id }, data: { autoAcceptFollows: false, isPrivate: false } });

const browser = await chromium.launch();
const errors = [];

async function signIn(identifier) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 960 } })).newPage();
  page.on("pageerror", (error) => errors.push(`${identifier}: ${error.message}`));
  await page.goto(`${BASE}/hyr`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', identifier);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 45_000 });
  return page;
}

console.log("Hyrja me emër përdoruesi:");
const visitor = await signIn(requester.username);
check(`u hap sesioni me @${requester.username}`, !visitor.url().includes("/hyr"));

console.log("Kërkesa për ndjekje:");
await visitor.goto(`${BASE}/u/${owner.username}`, { waitUntil: "networkidle" });
await visitor.getByRole("button", { name: /Ndiqe|Kërko ta ndjekësh/ }).first().click();
await visitor.waitForTimeout(2000);
check("butoni tregon kërkesën", (await visitor.getByRole("button", { name: /Kërkesa u dërgua/ }).count()) > 0);

const pending = await db.follow.findFirst({
  where: { followerId: requester.id, followingId: owner.id },
  select: { status: true },
});
check(`lidhja mbetet në pritje (${pending?.status})`, pending?.status === "pending");

console.log("Skeda e kërkesave:");
const host = await signIn("dea.morina@student.uni-pr.edu");
await host.goto(`${BASE}/njoftimet?tab=kerkesa`, { waitUntil: "networkidle" });
check("kërkesa del te skeda", (await host.getByText("Kërkesa për ndjekje").count()) > 0);
check("kërkuesi duket me emër përdoruesi", (await host.getByText(`@${requester.username}`).count()) > 0);
await host.screenshot({ path: "shots/e2e/follow-requests.png" });

await host.getByRole("button", { name: "Prano" }).first().click();
await host.waitForTimeout(2000);

const accepted = await db.follow.findFirst({
  where: { followerId: requester.id, followingId: owner.id },
  select: { status: true },
});
check(`pas pranimit ndjekja është e vërtetë (${accepted?.status})`, accepted?.status === "accepted");

console.log("Refuzimi:");
await db.follow.deleteMany({ where: { followerId: requester.id, followingId: owner.id } });
await visitor.goto(`${BASE}/u/${owner.username}`, { waitUntil: "networkidle" });
await visitor.getByRole("button", { name: /Ndiqe|Kërko ta ndjekësh/ }).first().click();
await visitor.waitForTimeout(2000);
await host.goto(`${BASE}/njoftimet?tab=kerkesa`, { waitUntil: "networkidle" });
await host.getByRole("button", { name: "Refuzo" }).first().click();
await host.waitForTimeout(2000);

const declined = await db.follow.findFirst({
  where: { followerId: requester.id, followingId: owner.id },
  select: { status: true },
});
check(`refuzimi shënohet (${declined?.status})`, declined?.status === "declined");

const stillThere = await host.getByRole("button", { name: "Prano" }).count();
check("kërkesa e trajtuar del nga lista", stillThere === 0);

/*
  Paneli i njoftimeve.

  Vendimi duhet të merret aty ku shfaqet njoftimi, jo vetëm te skeda e kërkesave:
  shumica e studentëve nuk e hapin kurrë atë skedë.
*/
console.log("Paneli i njoftimeve:");
await db.follow.deleteMany({ where: { followerId: requester.id, followingId: owner.id } });
await visitor.goto(`${BASE}/u/${owner.username}`, { waitUntil: "networkidle" });
await visitor.getByRole("button", { name: /Ndiqe|Kërko ta ndjekësh/ }).first().click();
await visitor.waitForTimeout(2000);

await host.goto(`${BASE}/feed`, { waitUntil: "networkidle" });
await host.getByRole("button", { name: /Njoftimet/ }).first().click();
await host.waitForTimeout(2500);

const inPanel = await host.getByRole("button", { name: "Prano" }).count();
check("kërkesa del me butona te paneli", inPanel > 0);

if (inPanel > 0) {
  await host.getByRole("button", { name: "Prano" }).first().click();
  await host.waitForTimeout(2500);

  const fromPanel = await db.follow.findFirst({
    where: { followerId: requester.id, followingId: owner.id },
    select: { status: true },
  });
  check(`pranimi nga paneli ruhet (${fromPanel?.status})`, fromPanel?.status === "accepted");
}

check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
if (errors.length) console.log(errors.slice(0, 3));

await browser.close();
await db.$disconnect();
console.log(failures ? `\n${failures} kontrolle dështuan.` : "\nTë gjitha kontrollet kaluan.");
process.exit(failures ? 1 : 0);
