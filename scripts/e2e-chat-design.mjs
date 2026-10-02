/**
 * Pamja e re e bisedës.
 *
 * Kalon: ftesa «Nis me një pyetje» te biseda bosh (pa sugjerime), ndarësit e
 * ditëve («Dje», «Sot»), grupimi i balonave me orën vetëm në fund, balona ime me
 * gradient, «+» dhe mikrofoni brenda fushës, «po shkruan» me pika, një vijë kur
 * u dërgua, dy kur arriti, 👀 pa tekst kur e pa, zemra me dy prekje, citimi që
 * të çon te origjinali, cilësimet (heshtja, linqet e ndara) dhe dy kolonat te
 * kompjuteri. Në celular: një kolonë, kamera e pajisjes drejt, asnjë rrëshqitje anash.
 *
 * Krijon mesazhe prove, prandaj pas tij lësho `npm run db:seed`.
 */

import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = process.argv[2] ?? "http://localhost:3000";
const SHOTS = process.env.SHOTS_DIR ?? null;
const PASSWORD = "provoje123";
const db = new PrismaClient();

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`  ${ok ? "OK  " : "DESH"} ${label}${ok || !detail ? "" : `  (${detail})`}`);
  if (!ok) failures += 1;
}

const me = await db.user.findFirstOrThrow({ where: { email: "dea.morina@student.uni-pr.edu" }, select: { id: true, username: true } });
const other = await db.user.findFirstOrThrow({ where: { email: "arian.bytyqi@gmail.com" }, select: { id: true, username: true, name: true } });
await db.user.update({ where: { id: other.id }, data: { showReadReceipts: true, showLastActive: true } });

const existing = await db.conversation.findFirst({
  where: { type: "direct", AND: [{ members: { some: { userId: me.id } } }, { members: { some: { userId: other.id } } }] },
  select: { id: true },
});
const conversation =
  existing ??
  (await db.conversation.create({
    data: { type: "direct", members: { create: [{ userId: me.id }, { userId: other.id }] } },
    select: { id: true },
  }));
await db.message.deleteMany({ where: { conversationId: conversation.id } });
await db.conversationMember.updateMany({
  where: { conversationId: conversation.id },
  data: { isAccepted: true, typingUntil: null, lastReadAt: new Date(Date.now() - 3 * 86_400_000) },
});

const browser = await chromium.launch();
const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: "sq" });
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(`${BASE}/hyr`, { waitUntil: "domcontentloaded" });
await page.fill('input[name="email"]', me.username);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 45_000 });

const url = `${BASE}/mesazhe/${conversation.id}`;

console.log("Biseda bosh:");
await page.goto(url, { waitUntil: "networkidle" });
check("del «Nis me një pyetje»", (await page.locator("[data-chat-start]").innerText()).includes("Nis me një pyetje"));
check("pa sugjerime teksti", (await page.locator("[data-chat-start] button").count()) === 0);
const field = page.locator("[data-composer-field]");
check("«+» dhe mikrofoni janë brenda fushës", (await field.locator("[data-attach-menu]").count()) === 1 && (await field.locator("[data-voice-record]").count()) === 1);
const middle = async (locator) => {
  const box = await locator.boundingBox();
  return box.y + box.height / 2;
};
const fieldMiddle = await middle(field);
check("«+» rri në mes të fushës", Math.abs((await middle(field.locator("[data-attach-menu]"))) - fieldMiddle) <= 2);
check("mikrofoni rri në mes, djathtas", Math.abs((await middle(field.locator("[data-voice-record]"))) - fieldMiddle) <= 2);
await page.locator("textarea").fill("provë");
check("me tekst del dërgimi, jo mikrofoni", (await page.locator("[data-voice-record]").count()) === 0);
await page.locator("textarea").fill("");
check("pa tekst del mikrofoni", (await page.locator("[data-voice-record]").count()) === 1);

console.log("\nDitët dhe grupet:");
const minute = 60_000;
const now = Date.now();
const yesterday = new Date(now - 86_400_000);
yesterday.setHours(18, 0, 0, 0);
const seeded = [];
async function add(author, text, at, extra = {}) {
  const row = await db.message.create({
    data: { conversationId: conversation.id, authorId: author.id, text, createdAt: new Date(at), ...extra },
    select: { id: true },
  });
  seeded.push(row.id);
  return row.id;
}
const first = await add(other, "A e ke parë orarin e provimeve?", yesterday.getTime());
await add(me, "Po, del të hënën.", yesterday.getTime() + minute);
await add(me, "Ora 10 te salla 3.", now - 30 * minute);
await add(me, "Unë i kam shënimet nëse do.", now - 29 * minute);
await add(me, "I dërgoj sonte.", now - 28 * minute);
await add(other, "Super, faleminderit!", now - 10 * minute, { replyToId: first });
await db.conversationMember.updateMany({ where: { conversationId: conversation.id, userId: me.id }, data: { lastReadAt: new Date() } });

await page.goto(url, { waitUntil: "networkidle" });
const separators = await page.locator("[data-day-separator]").allInnerTexts();
check("ndarësit «Dje» dhe «Sot»", separators.join("|") === "Dje|Sot", separators.join("|"));
const run = page.locator('[data-message-id]').filter({ hasText: /Ora 10|Unë i kam|I dërgoj/ });
check("tri mesazhet e mia janë një grup", (await run.count()) === 3 && (await run.nth(0).getAttribute("data-starts-group")) === "true" && (await run.nth(1).getAttribute("data-starts-group")) === null);
const metas = await Promise.all([0, 1, 2].map((index) => run.nth(index).locator("[data-message-meta]").count()));
check("ora del vetëm te e fundit e grupit", metas.join(",") === "0,0,1", metas.join(","));
const style = await run.nth(2).locator("[data-bubble]").evaluate((node) => {
  const css = getComputedStyle(node);
  return { radius: css.borderTopLeftRadius, corner: css.borderBottomRightRadius, image: css.backgroundImage, max: getComputedStyle(node.parentElement).maxWidth };
});
check("balona 18px me qoshe të vogël nga ana ime", style.radius === "18px" && style.corner === "5px", JSON.stringify(style));
check("balona ime ka gradient blu", style.image.includes("linear-gradient"), style.image);
check("gjerësia maksimale 72%", style.max === "72%", style.max);

await run.nth(0).locator("[data-bubble]").click();
await page.waitForTimeout(450);
check("prekja e balonës tregon orën", (await run.nth(0).locator("[data-message-meta]").count()) === 1);

console.log("\nCitimi, zemra, gjendja:");
check("asnjë përgjigje e shpejtë", (await page.locator("[data-quick-replies]").count()) === 0);
const quote = page.locator("[data-reply-quote]");
check("citimi del mbi balonë", (await quote.count()) === 1);
await quote.click();
await page.waitForTimeout(300);
check("prekja e citimit ndriçon origjinalin", (await page.locator(`[data-message-id="${first}"] [data-bubble]`).getAttribute("class")).includes("ring-2"));
const theirs = page.locator(`[data-message-id="${first}"] [data-bubble]`);
await theirs.dblclick();
await page.waitForTimeout(1500);
check("dy prekje japin ❤️", (await db.messageReaction.count({ where: { messageId: first, userId: me.id, emoji: "❤️" } })) === 1);
check("zemra del si kapsulë nën balonë", (await page.locator(`[data-message-id="${first}"] [data-reaction="❤️"]`).count()) === 1);

// Tjetri s'ka qenë aktiv pas mesazheve: një vijë e vetme.
await db.user.update({ where: { id: other.id }, data: { lastSeenAt: new Date(Date.now() - 2 * 86_400_000) } });
await page.locator("textarea").fill("Faleminderit!");
await page.keyboard.press("Enter");
await page.waitForTimeout(4500);
check("mesazhi u dërgua", (await db.message.count({ where: { conversationId: conversation.id, authorId: me.id, text: "Faleminderit!" } })) === 1);
check("një vijë kur u dërgua", (await page.locator('[data-status="sent"]').count()) >= 1);
await db.user.update({ where: { id: other.id }, data: { lastSeenAt: new Date() } });
await page.waitForTimeout(4500);
check("dy vija kur arriti", (await page.locator('[data-status="delivered"]').count()) >= 1 && (await page.locator('[data-status="sent"]').count()) === 0);

console.log("\nShkruan dhe e pa:");
await db.conversationMember.updateMany({ where: { conversationId: conversation.id, userId: other.id }, data: { typingUntil: new Date(Date.now() + 15_000) } });
await page.locator("[data-typing]").waitFor({ timeout: 10_000 }).catch(() => {});
const typingText = (await page.locator("[data-typing]").count()) ? await page.locator("[data-typing]").innerText() : "";
check("«po shkruan» me tri pika", typingText.includes("po shkruan") && (await page.locator("[data-typing] .animate-typing").count()) === 3, typingText);
if (SHOTS) await page.screenshot({ path: `${SHOTS}/chat-desktop.png` });

check("para leximit: pa 👀", (await page.locator("[data-seen-mark]").count()) === 0);
await db.conversationMember.updateMany({ where: { conversationId: conversation.id, userId: other.id }, data: { lastReadAt: new Date(), typingUntil: null } });
await page.locator("[data-seen-mark]").waitFor({ timeout: 10_000 }).catch(() => {});
const seen = page.locator("[data-seen-mark]");
check("👀 në vend të vijave, pa tekst", (await seen.count()) >= 1 && (await seen.first().innerText()).trim() === "👀");
check("asnjë «Pa» si tekst", (await page.getByText("Pa", { exact: true }).count()) === 0);
check("te mesazhi i parë nuk ka më vija", (await page.locator('[data-status="delivered"], [data-status="sent"]').count()) === 0);
check("«po shkruan» iku", (await page.locator("[data-typing]").count()) === 0);

console.log("\nCilësimet e bisedës:");
await add(other, "Materialet janë këtu: https://example.com/shenime", Date.now());
await page.locator("[data-chat-settings-open]").click();
await page.locator("[data-chat-settings]").waitFor();
await page.locator('[data-mute-choice="1"]').click();
await page.waitForTimeout(2000);
const muted = await db.conversationMember.findFirst({ where: { conversationId: conversation.id, userId: me.id }, select: { mutedUntil: true } });
const mutedHours = muted.mutedUntil ? (muted.mutedUntil.getTime() - Date.now()) / 3_600_000 : 0;
check("heshtja për 1 orë", mutedHours > 0.9 && mutedHours <= 1.01, mutedHours.toFixed(2));
check("dritarja tregon deri kur", (await page.locator("[data-muted-until]").count()) === 1);
await page.getByRole("tab", { name: "Linqet" }).click();
await page.locator("[data-shared-links] a").first().waitFor({ timeout: 8000 }).catch(() => {});
check("linku i ndarë del te «Linqet»", (await page.locator('[data-shared-links] a[href="https://example.com/shenime"]').count()) === 1);
await page.locator("[data-unmute]").click();
await page.waitForTimeout(1500);
check("njoftimet ndizen prapë", (await db.conversationMember.findFirst({ where: { conversationId: conversation.id, userId: me.id }, select: { mutedUntil: true } })).mutedUntil === null);
await page.keyboard.press("Escape");

console.log("\nDy kolona:");
check("lista majtas te kompjuteri", await page.locator("[data-messages-column]").isVisible());
check("biseda e hapur ndriçon te lista", (await page.locator(`[data-conversation-list] a[href="/mesazhe/${conversation.id}"]`).getAttribute("aria-current")) === "page");
await page.goto(`${BASE}/mesazhe`, { waitUntil: "networkidle" });
check("/mesazhe te kompjuteri fton të zgjedhësh", await page.locator("[data-pick-conversation]").isVisible());

console.log("\nCelulari:");
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "sq", storageState: await context.storageState() });
const mobile = await phone.newPage();
mobile.on("pageerror", (error) => errors.push(error.message));
await mobile.goto(url, { waitUntil: "networkidle" });
check("pa kolonën e listës", !(await mobile.locator("[data-messages-column]").isVisible()));
await mobile.locator("[data-attach-menu]").click();
const chooser = mobile.waitForEvent("filechooser", { timeout: 4000 }).catch(() => null);
await mobile.locator('[data-attach="camera"]').click();
const picked = await chooser;
check("«Bëj foto» hap kamerën e telefonit drejt", Boolean(picked) && (await mobile.locator("[data-camera]").count()) === 0);
const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("asnjë rrëshqitje anash", overflow <= 1, `${overflow}px`);
if (SHOTS) await mobile.screenshot({ path: `${SHOTS}/chat-mobile.png` });
await mobile.goto(`${BASE}/mesazhe`, { waitUntil: "networkidle" });
check("/mesazhe në celular është lista", (await mobile.locator(`a[href="/mesazhe/${conversation.id}"]`).count()) >= 1);

check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
if (errors.length) console.log(errors.join("\n"));

await browser.close();
await db.$disconnect();
console.log(failures === 0 ? "\nTë gjitha kontrollet kaluan." : `\n${failures} kontrolle dështuan.`);
process.exit(failures === 0 ? 0 : 1);
