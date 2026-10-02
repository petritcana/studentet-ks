/**
 * Biseda si bisedë.
 *
 * Dy shfletues në të njëjtën bisedë: ajo që shkruan njëri duhet të dalë te
 * tjetri pa e rifreskuar faqen, dhe shenja «e parë» duhet të vijë kur tjetri e
 * hap vërtet. Kjo është ndryshimi mes një kutie mesazhesh dhe një bisede.
 *
 * Krijon mesazhe prove, prandaj pas tij lësho `npm run db:seed`.
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

const one = await db.user.findFirst({
  where: { email: "dea.morina@student.uni-pr.edu" },
  select: { id: true, username: true },
});
const two = await db.user.findFirst({
  where: { email: "arian.bytyqi@gmail.com" },
  select: { id: true, username: true },
});

const existing = await db.conversation.findFirst({
  where: {
    type: "direct",
    AND: [{ members: { some: { userId: one.id } } }, { members: { some: { userId: two.id } } }],
  },
  select: { id: true },
});

const conversation =
  existing ??
  (await db.conversation.create({
    data: { type: "direct", members: { create: [{ userId: one.id }, { userId: two.id }] } },
    select: { id: true },
  }));

await db.message.deleteMany({ where: { conversationId: conversation.id } });
await db.conversationMember.updateMany({
  where: { conversationId: conversation.id },
  data: { isAccepted: true, typingUntil: null },
});

const browser = await chromium.launch();
const errors = [];

async function open(username) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${username}: ${error.message}`));

  await page.goto(`${BASE}/hyr`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', username);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 45_000 });

  await page.goto(`${BASE}/mesazhe/${conversation.id}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  return page;
}

const a = await open(one.username);
const b = await open(two.username);

console.log("Mesazhi vjen vetë:");
await a.locator("textarea").first().fill("A e ke parë afatin e provimit?");
await a.getByRole("button", { name: /Dërgo/ }).first().click();

// Asnjë rifreskim te shfletuesi i dytë: vetëm pritje.
await b.waitForTimeout(6000);
check(
  "mesazhi doli te tjetri pa rifreskim",
  (await b.getByText("A e ke parë afatin e provimit?").count()) > 0,
);

console.log("Përgjigja kthehet:");
await b.locator("textarea").first().fill("Po, është të premten.");
await b.getByRole("button", { name: /Dërgo/ }).first().click();
await a.waitForTimeout(6000);
check("përgjigja doli te i pari pa rifreskim", (await a.getByText("Po, është të premten.").count()) > 0);

console.log("Shenja «po shkruan»:");
await b.locator("textarea").first().fill("Po shkruaj tani");
await a.waitForTimeout(6000);
check("tjetri e sheh që po shkruhet", (await a.getByText(/po shkruan/).count()) > 0);

console.log("Shenja «e parë»:");
// I pari ka shkruar, i dyti e ka hapur bisedën: mesazhi duhet të jetë i parë.
await a.waitForTimeout(5000);
check("mesazhi im shfaqet si i parë", (await a.locator('[aria-label="E parë"]').count()) > 0);

check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
if (errors.length > 0) console.log(errors.slice(0, 3));

await browser.close();
await db.$disconnect();

console.log(failures ? `\n${failures} kontrolle dështuan.` : "\nTë gjitha kontrollet kaluan.");
process.exit(failures ? 1 : 0);
