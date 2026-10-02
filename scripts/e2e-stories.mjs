/**
 * Provë në shfletues për veprimet mbi storjet.
 *
 * Storja ime: Shto në dosje (ekzistuese dhe e re), Arkivo, Fshije me konfirmim.
 * Storja e tjetrit: përgjigja dhe reagimi, që dalin si mesazh me storjen te
 * biseda. Krijon të dhëna prove, prandaj pas tij lësho `npm run db:seed`.
 */

import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = process.argv[2] ?? "http://localhost:3000";
const db = new PrismaClient();

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`  ${ok ? "OK  " : "DESH"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures += 1;
}

const svg = (color) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960"><rect width="540" height="960" fill="${color}"/></svg>`,
  )}`;

const [erza, fisnik] = await Promise.all([
  db.user.findUniqueOrThrow({ where: { username: "erza.krasniqi" } }),
  db.user.findUniqueOrThrow({ where: { username: "fisnik.hoxha" } }),
]);

// Rafti i Erzës: dy storje të sajat dhe një e Fisnikut, që ajo e ndjek.
await db.story.deleteMany({ where: { authorId: { in: [erza.id, fisnik.id] }, expiresAt: { gt: new Date() } } });
const expiresAt = new Date(Date.now() + 20 * 3_600_000);
const mineA = await db.story.create({ data: { authorId: erza.id, mediaUrl: svg("#0ea5e9"), expiresAt } });
const mineB = await db.story.create({ data: { authorId: erza.id, mediaUrl: svg("#f43f5e"), expiresAt } });
const theirs = await db.story.create({ data: { authorId: fisnik.id, mediaUrl: svg("#84cc16"), expiresAt } });
await db.follow.upsert({
  where: { followerId_followingId: { followerId: erza.id, followingId: fisnik.id } },
  create: { followerId: erza.id, followingId: fisnik.id, status: "accepted" },
  update: { status: "accepted" },
});

const browser = await chromium.launch();
const errors = [];

async function signIn(email) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${email}: ${error.message}`));
  await page.goto(`${BASE}/hyr`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[type="password"]', "provoje123");
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 30_000 });
  return page;
}

async function openStory(page, name) {
  await page.goto(`${BASE}/feed`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: new RegExp(name) }).first().click();
  await page.locator('[role="dialog"][aria-modal="true"]').waitFor();
}

const page = await signIn("erza.krasniqi@student.uni-pr.edu");

console.log("Storja ime:");
await openStory(page, erza.name);
check("shiriti i pronarit del", (await page.locator("[data-story-owner]").count()) === 1);
check("te storja ime nuk ka përgjigje", (await page.locator("[data-story-reply]").count()) === 0);

// Shiriti mbushet me kohën, dhe mbajtja e gishtit e ndal.
const width = () => page.locator("[data-story-progress]").evaluate((node) => parseFloat(node.style.width) || 0);
const early = await width();
await page.waitForTimeout(1200);
const later = await width();
check("shiriti mbushet ndërsa storja rri", later > early + 10, `${early.toFixed(0)}% -> ${later.toFixed(0)}%`);
const box = await page.locator('[role="dialog"][aria-modal="true"] > div').boundingBox();
await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5);
await page.mouse.down();
await page.waitForTimeout(400);
const held = await width();
await page.waitForTimeout(1500);
const stillHeld = await width();
check("mbajtja e ndal storjen", Math.abs(stillHeld - held) < 2, `${held.toFixed(0)}% -> ${stillHeld.toFixed(0)}%`);
await page.mouse.up();
await page.waitForTimeout(300);
check("lëshimi nuk kalon te storja tjetër", (await page.locator('[data-story-segment="current"]').count()) === 1 && (await page.locator('[data-story-segment="done"]').count()) === 0);

await page.locator('[data-story-owner-action="highlight"]').click();
await page.locator('[data-story-highlight-choice="place"]').waitFor({ timeout: 10_000 });
const pausedBefore = await page.locator("[data-story-owner]").count();
await page.waitForTimeout(5_500);
check("storja ndalet kur paneli është hapur", (await page.locator("[data-story-owner]").count()) === pausedBefore && (await page.locator("[data-story-highlight-panel]").count()) === 1);
await page.locator('[data-story-highlight-choice="place"]').click();
await page.waitForTimeout(1_500);
const inPlace = await db.storyHighlightItem.count({ where: { storyId: mineA.id, highlight: { userId: erza.id, title: "place" } } });
check("u shtua te dosja «place»", inPlace === 1);

await page.locator("[data-story-highlight-new]").fill("provë e re");
await page.locator("[data-story-highlight-new]").press("Enter");
await page.waitForTimeout(1_500);
const created = await db.storyHighlight.findFirst({ where: { userId: erza.id, title: "provë e re" }, include: { items: true } });
check("dosja e re u krijua me storjen brenda", created?.items.length === 1 && created.items[0].storyId === mineA.id);

await page.locator('[data-story-owner-action="archive"]').click();
await page.waitForTimeout(1_500);
const archived = await db.story.findUnique({ where: { id: mineA.id } });
check("arkivimi e nxori nga rafti, jo nga baza", Boolean(archived) && archived.expiresAt <= new Date());

// Pas arkivimit shikuesi kalon te storja e dytë e Erzës: e fshijmë atë.
await page.locator('[data-story-owner-action="delete"]').click();
await page.locator("[data-story-delete-confirm]").click();
await page.waitForTimeout(1_500);
check("fshirja me konfirmim", (await db.story.count({ where: { id: mineB.id } })) === 0);

console.log("Storja e tjetrit:");
await openStory(page, fisnik.name);
check("përgjigjja del te storja e tjetrit", (await page.locator("[data-story-reply]").count()) === 1);
check("shiriti i pronarit nuk del", (await page.locator("[data-story-owner]").count()) === 0);

await page.locator("[data-story-like]").click();
await page.waitForTimeout(1_200);
await page.locator("[data-story-reply-input]").click();
await page.locator('[data-story-react="🔥"]').click();
await page.waitForTimeout(1_200);
const reactions = await db.message.findMany({ where: { authorId: erza.id, storyId: theirs.id, kind: "story_reaction" } });
check("reagimi i dytë e ndërron, nuk shton", reactions.length === 1 && reactions[0].text === "🔥", reactions.map((row) => row.text).join(","));

await page.locator("[data-story-reply-input]").fill("Sa foto e bukur!");
await page.locator("[data-story-reply-input]").press("Enter");
await page.waitForTimeout(1_500);
const reply = await db.message.findFirst({ where: { authorId: erza.id, storyId: theirs.id, kind: "story_reply" } });
check("përgjigjja u ruajt si mesazh me storjen", reply?.text === "Sa foto e bukur!");

console.log("Te mesazhet:");
const owner = await signIn("fisnik.hoxha@student.uni-pr.edu");
await owner.goto(`${BASE}/mesazhe/${reply.conversationId}`, { waitUntil: "networkidle" });
check("Fisniku e sheh storjen te biseda", (await owner.locator("[data-story-message]").count()) >= 2);
check("reagimi del si emoji i madh", (await owner.locator("[data-story-reaction-text]").count()) >= 1);
await owner.screenshot({ path: "shots/e2e/story-messages.png" });

console.log("Siguria:");
const stranger = await db.user.findFirst({ where: { isPrivate: true, id: { notIn: [erza.id, fisnik.id] } } });
if (stranger) {
  const secret = await db.story.create({ data: { authorId: stranger.id, mediaUrl: svg("#000000"), expiresAt } });
  const followsStranger = await db.follow.count({ where: { followerId: erza.id, followingId: stranger.id, status: "accepted" } });
  if (followsStranger === 0) {
    await page.goto(`${BASE}/feed`);
    // Rafti nuk e tregon; `storyForReply` te serveri e refuzon edhe me id të marrë me dorë.
    check("storja e profilit privat nuk është te rafti", (await page.getByRole("button", { name: new RegExp(stranger.name) }).count()) === 0);
  }
  await db.story.delete({ where: { id: secret.id } });
}

check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
if (errors.length) console.log(errors.join("\n"));

await browser.close();
await db.$disconnect();
console.log(failures === 0 ? "Të gjitha kontrollet kaluan." : `${failures} kontrolle dështuan.`);
process.exit(failures === 0 ? 0 : 1);
