/**
 * Grupet: hapja, privatësia, kufijtë dhe njoftimet.
 *
 * Provon edhe se kufiri i grupeve zbatohet te serveri, jo te butoni.
 *
 * Krijon grupe prove, prandaj pas tij lësho `npm run db:seed`.
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

// Gjendje e pastër: pa grupe të hapura nga ky student.
const owned = await db.groupMember.findMany({
  where: { userId: me.id, role: "owner" },
  select: { groupId: true },
});
await db.group.deleteMany({ where: { id: { in: owned.map((row) => row.groupId) } } });
await db.user.update({ where: { id: me.id }, data: { proEarnedUntil: null } });
await db.subscription.deleteMany({ where: { userId: me.id } });

const browser = await chromium.launch();
const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(`${BASE}/hyr`, { waitUntil: "domcontentloaded" });
await page.fill('input[name="email"]', me.username);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 45_000 });

console.log("Hapja:");
await page.goto(`${BASE}/komuniteti?tab=grupet`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);

await page.getByRole("button", { name: "Hap grup" }).click();
await page.waitForTimeout(800);
await page.fill("#group-name", "Grupi i provës");
await page.fill("#group-description", "Një grup që e hap testi.");
await page.getByRole("button", { name: "Me kërkesë" }).click();
await page.getByRole("button", { name: "Hap grup" }).last().click();
await page.waitForTimeout(3500);

const created = await db.group.findFirst({
  where: { name: "Grupi i provës" },
  select: { id: true, privacy: true, members: { select: { userId: true, role: true } } },
});
check("grupi u krijua", Boolean(created), created?.id ?? "asnjë");
check("privatësia u ruajt", created?.privacy === "request", created?.privacy ?? "");
check(
  "krijuesi është pronar",
  created?.members.some((member) => member.userId === me.id && member.role === "owner"),
);
check("faqja e grupit u hap", page.url().includes("/grupet/"), page.url());

console.log("Kufiri:");
// Tri grupe janë kufiri i llogarisë pa Pro; dy të tjera plotësojnë kuotën.
for (const name of ["Grupi dy", "Grupi tre"]) {
  await db.group.create({
    data: {
      name,
      nameEn: name,
      type: "custom",
      privacy: "public",
      members: { create: { userId: me.id, role: "owner" } },
    },
  });
}

await page.goto(`${BASE}/komuniteti?tab=grupet`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.getByRole("button", { name: "Hap grup" }).first().click();
await page.waitForTimeout(800);
await page.fill("#group-name", "Grupi i katërt");
await page.getByRole("button", { name: "Hap grup" }).last().click();
await page.waitForTimeout(3000);

const overLimit = await db.group.findFirst({ where: { name: "Grupi i katërt" }, select: { id: true } });
check("kufiri ndalon të katërtin", overLimit === null);

console.log("Njoftimi i grupit:");
const other = await db.user.findFirst({
  where: { email: "dea.morina@student.uni-pr.edu" },
  select: { id: true, username: true },
});

await db.groupMember.create({ data: { groupId: created.id, userId: other.id, role: "member" } });
await db.notification.deleteMany({ where: { userId: other.id, type: "group_post" } });

await db.post.create({
  data: {
    authorId: me.id,
    type: "text",
    text: "Postimi i parë te grupi.",
    scope: "faculty",
    groupId: created.id,
  },
});

// Njoftimi vjen nga veprimi, jo nga shkrimi i drejtpërdrejtë: prandaj kontrollohet
// rruga e vërtetë përmes faqes së grupit.
await page.goto(`${BASE}/grupet/${created.id}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);

const box = page.locator("textarea").first();
if ((await box.count()) > 0) {
  await box.fill("Postim nga testi te grupi.");
  await page.getByRole("button", { name: /Posto|Dërgo/ }).last().click();
  await page.waitForTimeout(3500);
}

const notice = await db.notification.findFirst({
  where: { userId: other.id, type: "group_post" },
  select: { groupKey: true },
});
check("anëtari u njoftua", Boolean(notice), notice?.groupKey ?? "asnjë");

check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
if (errors.length > 0) console.log(errors.slice(0, 3));

await browser.close();
await db.$disconnect();

console.log(failures ? `\n${failures} kontrolle dështuan.` : "\nTë gjitha kontrollet kaluan.");
process.exit(failures ? 1 : 0);
