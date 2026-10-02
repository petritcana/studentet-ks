/**
 * Asistenti si bisedë.
 *
 * Provon rrugën, jo zgjuarsinë: pyetja shkon, përgjigjja kthehet, filli ruhet
 * dhe pyetja e dytë hyn te e njëjta bisedë me historikun e saj. Kjo është ajo
 * që duhet të jetë e saktë para se çelësi i modelit të vendoset; pa këtë, as
 * modeli më i mirë nuk do të mbante bisedë.
 *
 * Krijon bisedë prove, prandaj pas tij lësho `npm run db:seed`.
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
  where: { email: "dea.morina@student.uni-pr.edu" },
  select: { id: true, username: true },
});

await db.aiMessage.deleteMany({ where: { conversation: { userId: me.id } } });
await db.aiConversation.deleteMany({ where: { userId: me.id } });

const browser = await chromium.launch();
const errors = [];
const page = await (await browser.newContext({ viewport: { width: 1440, height: 960 } })).newPage();
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(`${BASE}/hyr`, { waitUntil: "domcontentloaded" });
await page.fill('input[name="email"]', me.username);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 45_000 });

await page.goto(`${BASE}/feed`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3500);

console.log("Hapja:");
await page.getByRole("button", { name: "Hap asistentin" }).first().click();
await page.waitForTimeout(1500);

const box = page.locator("textarea").last();
check("paneli u hap", (await box.count()) > 0);

console.log("Pyetja e parë:");
await box.fill("Si e përgatis provimin e Ekonomisë?");
await box.press("Enter");
await page.waitForTimeout(6000);

const first = await db.aiConversation.findFirst({
  where: { userId: me.id },
  select: { id: true, _count: { select: { messages: true } } },
});
check("biseda u hap", Boolean(first), first?.id ?? "asnjë");
check("pyetja dhe përgjigjja u ruajtën", (first?._count.messages ?? 0) >= 2, String(first?._count.messages));

const answered = await db.aiMessage.findFirst({
  where: { conversationId: first.id, role: "assistant" },
  select: { content: true },
});
check("erdhi një përgjigje", (answered?.content ?? "").trim().length > 0);

console.log("Pyetja e dytë, i njëjti fill:");
await page.locator("textarea").last().fill("Po për javën e fundit, çfarë të lexoj?");
await page.locator("textarea").last().press("Enter");
await page.waitForTimeout(6000);

const threads = await db.aiConversation.count({ where: { userId: me.id } });
check("nuk u hap bisedë e dytë", threads === 1, String(threads));

const total = await db.aiMessage.count({ where: { conversationId: first.id } });
check("të katër radhët janë te e njëjta bisedë", total >= 4, String(total));

const order = await db.aiMessage.findMany({
  where: { conversationId: first.id },
  orderBy: { createdAt: "asc" },
  select: { role: true },
});
check(
  "rendi alternon pyetje, përgjigje",
  order[0]?.role === "user" && order[1]?.role === "assistant",
  order.map((row) => row.role).join(","),
);

console.log("Dy modele:");
const picker = page.getByRole("radiogroup", { name: "Modeli" });
const choices = await picker.getByRole("radio").count();
if (choices >= 2) {
  check("zgjedhja e modelit ka dy modele", choices === 2, String(choices));
  await picker.getByRole("radio", { name: "Claude" }).click();
  const before = await db.aiMessage.count({ where: { conversationId: first.id, role: "assistant" } });
  await page.locator("textarea").last().fill("Çfarë është elasticiteti i kërkesës?");
  await page.locator("textarea").last().press("Enter");
  await page.waitForTimeout(9000);
  const after = await db.aiMessage.count({ where: { conversationId: first.id, role: "assistant" } });
  // Kur Claude nuk ka kredit, përgjigjet modeli tjetër: studenti merr gjithsesi përgjigje.
  check("me Claude të zgjedhur vjen përgjigje", after === before + 1, `${before} -> ${after}`);
  check(
    "etiketat nën përgjigje u hoqën",
    (await page.getByText(/Nuk gjeta material|Përgjigje e gjeneruar/).count()) === 0,
  );
} else {
  console.log(`  VËRE  vetëm ${choices} model me çelës: zgjedhja nuk shfaqet`);
}

console.log("Gjendja e ofruesit:");
// Vetëm teksti i dukshëm: `textContent` lexon edhe katalogun e përkthimeve që
// dërgohet brenda faqes, dhe aty fjala «demonstruese» ekziston gjithmonë.
const mock = (await page.getByText(/demonstruese|demonstration/).filter({ visible: true }).count()) > 0;
console.log(`  VËRE  ofruesi ${mock ? "demonstrues: vendos çelësin te .env" : "i vërtetë"}`);

check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
if (errors.length > 0) console.log(errors.slice(0, 3));

await browser.close();
await db.$disconnect();

console.log(failures ? `\n${failures} kontrolle dështuan.` : "\nTë gjitha kontrollet kaluan.");
process.exit(failures ? 1 : 0);
