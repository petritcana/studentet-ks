/**
 * Biseda e avancuar.
 *
 * Kalon: dërgimi, foto, përgjigjja, reagimi, redaktimi, fshirja e butë, shenja
 * e leximit, shenja «po shkruan» dhe kërkimi brenda bisedës.
 *
 * Krijon mesazhe prove, prandaj pas tij lësho `npm run db:seed`.
 */

import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PASSWORD = "provoje123";
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

const me = await db.user.findFirst({
  where: { email: "dea.morina@student.uni-pr.edu" },
  select: { id: true, username: true },
});
const other = await db.user.findFirst({
  where: { email: "arian.bytyqi@gmail.com" },
  select: { id: true, username: true, name: true },
});

// Një bisedë e pastër mes të dyve.
const existing = await db.conversation.findFirst({
  where: {
    type: "direct",
    AND: [{ members: { some: { userId: me.id } } }, { members: { some: { userId: other.id } } }],
  },
  select: { id: true },
});

const conversation =
  existing ??
  (await db.conversation.create({
    data: {
      type: "direct",
      members: { create: [{ userId: me.id }, { userId: other.id }] },
    },
    select: { id: true },
  }));

await db.message.deleteMany({ where: { conversationId: conversation.id } });
await db.conversationMember.updateMany({
  where: { conversationId: conversation.id },
  data: { isAccepted: true, typingUntil: null },
});

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

await signIn(me.username);
await page.goto(`${BASE}/mesazhe/${conversation.id}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);

console.log("Dërgimi:");
await page.locator("textarea").first().fill("Mesazhi i parë i provës.");
await page.getByRole("button", { name: /Dërgo/ }).first().click();
await page.waitForTimeout(3000);

const first = await db.message.findFirst({
  where: { conversationId: conversation.id },
  orderBy: { createdAt: "desc" },
  select: { id: true, text: true },
});
check("mesazhi u ruajt", first?.text === "Mesazhi i parë i provës.", first?.text ?? "asnjë");

console.log("Shenja «po shkruan»:");
await page.locator("textarea").first().fill("Po shkruaj diçka");
await page.waitForTimeout(1500);

const typing = await db.conversationMember.findFirst({
  where: { conversationId: conversation.id, userId: me.id },
  select: { typingUntil: true },
});
check("shenja u shënua", Boolean(typing?.typingUntil && typing.typingUntil > new Date()));

console.log("Fotoja:");
await page.locator("textarea").first().fill("");
await page
  .locator('input[type="file"]')
  .first()
  .setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG });
await page.waitForTimeout(3500);
await page.getByRole("button", { name: /Dërgo/ }).first().click();
await page.waitForTimeout(3500);

const withMedia = await db.message.findFirst({
  where: { conversationId: conversation.id, NOT: { media: "[]" } },
  select: { media: true },
});
check("fotoja u dërgua", Boolean(withMedia), withMedia?.media?.slice(0, 40) ?? "asnjë");

console.log("Reagimi dhe përgjigjja:");
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);

await page.locator("[data-message-id]").first().hover();
await page.getByRole("button", { name: "Veprime për mesazhin" }).first().click();
await page.waitForTimeout(800);
await page.getByRole("button", { name: "👍" }).first().click();
await page.waitForTimeout(2000);
await page.keyboard.press("Escape");
await page.waitForTimeout(800);

const reaction = await db.messageReaction.findFirst({
  where: { messageId: first.id, userId: me.id },
  select: { emoji: true },
});
check("reagimi u ruajt", reaction?.emoji === "👍", reaction?.emoji ?? "asnjë");

await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
await page.locator("[data-message-id]").first().hover();
await page.getByRole("button", { name: "Veprime për mesazhin" }).first().click();
await page.waitForTimeout(800);
await page.getByRole("menuitem", { name: "Përgjigju" }).click();
await page.waitForTimeout(800);
await page.locator("textarea").first().fill("Kjo është përgjigje.");
await page.getByRole("button", { name: /Dërgo/ }).first().click();
await page.waitForTimeout(3000);

const reply = await db.message.findFirst({
  where: { conversationId: conversation.id, replyToId: first.id },
  select: { text: true },
});
check("përgjigja u lidh me mesazhin", Boolean(reply), reply?.text ?? "asnjë");

console.log("Redaktimi dhe fshirja:");
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);

const target = page.locator("[data-message-id]").last();
await target.hover();
await target.getByRole("button", { name: "Veprime për mesazhin" }).click();
await page.waitForTimeout(800);
await page.getByRole("menuitem", { name: "Ndrysho" }).click();
await page.waitForTimeout(500);
await page.locator("textarea").first().fill("Përgjigje e redaktuar.");
await page.getByRole("button", { name: /Dërgo/ }).first().click();
await page.waitForTimeout(3000);

const edited = await db.message.findFirst({
  where: { conversationId: conversation.id, editedAt: { not: null } },
  select: { text: true },
});
check("redaktimi u ruajt", edited?.text === "Përgjigje e redaktuar.", edited?.text ?? "asnjë");

await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
const last = page.locator("[data-message-id]").last();
await last.hover();
await last.getByRole("button", { name: "Veprime për mesazhin" }).click();
await page.waitForTimeout(800);
await page.getByRole("menuitem", { name: "Fshij" }).click();
await page.waitForTimeout(3000);

const deleted = await db.message.findFirst({
  where: { conversationId: conversation.id, deletedAt: { not: null } },
  select: { text: true },
});
check("fshirja është e butë", deleted !== null && deleted.text === "", String(deleted?.text));

console.log("Kërkimi:");
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
await page.getByRole("button", { name: "Kërko te biseda" }).click();
await page.waitForTimeout(600);
await page.locator('input[aria-label="Kërko te biseda"]').fill("i parë");
await page.waitForTimeout(1200);
check("kërkimi ngushton listën", (await page.locator("[data-message-id]").count()) === 1);

console.log("Shenja e leximit:");
await signIn(other.username);
await page.goto(`${BASE}/mesazhe/${conversation.id}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3500);

await signIn(me.username);
await page.goto(`${BASE}/mesazhe/${conversation.id}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
check("mesazhi shfaqet si i parë", (await page.locator('[aria-label="E parë"], [data-seen-mark]').count()) > 0);

check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
if (errors.length > 0) console.log(errors.slice(0, 3));

await browser.close();
await db.$disconnect();

console.log(failures ? `\n${failures} kontrolle dështuan.` : "\nTë gjitha kontrollet kaluan.");
process.exit(failures ? 1 : 0);
