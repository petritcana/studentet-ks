/**
 * Mesazhet: kërkimi i njerëzve dhe «Bisedë e re», plus fotot e mëdha.
 *
 * Te faqja e mesazheve shkruhet një emër, del personi, dhe prekja e tij hap
 * bisedën. «Bisedë e re» hap dialogun me shokët, dhe paneli i shiritit të sipërm
 * ka të njëjtin kërkim. Një foto 3000x3000 me zhurmë (mbi 25MB si PNG) zvogëlohet
 * në shfletues dhe ngarkohet te kompozuesi.
 *
 * Krijon të dhëna prove, prandaj pas tij lësho `npm run db:seed`.
 */

import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import { mkdtempSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { deflateSync } from "node:zlib";

const BASE = process.argv[2] ?? "http://localhost:3000";
const db = new PrismaClient();

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`  ${ok ? "OK  " : "DESH"} ${label}${ok || !detail ? "" : `  (${detail})`}`);
  if (!ok) failures += 1;
}

/** PNG me zhurmë: nuk kompresohet, prandaj del i rëndë si foto e vërtetë telefoni. */
function noisyPng(width, height) {
  const table = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (bytes) => {
    let c = 0xffffffff;
    for (const byte of bytes) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, "latin1");
    const tail = Buffer.alloc(4);
    tail.writeUInt32BE(crc(Buffer.concat([Buffer.from(type, "latin1"), data])), 0);
    return Buffer.concat([head, data, tail]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  // Bajta të rastësishëm: PNG-ja nuk kompresohet dot dhe del mbi 25MB.
  const raw = randomBytes((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) raw[y * (width * 3 + 1)] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 1 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const dir = mkdtempSync(join(tmpdir(), "mesazhet-"));
const bigPhoto = join(dir, "foto-e-madhe.png");
writeFileSync(bigPhoto, noisyPng(3000, 3000));
const bigBytes = statSync(bigPhoto).size;

const dea = await db.user.findFirstOrThrow({ where: { username: "dea.morina" }, select: { id: true } });
const arian = await db.user.findFirstOrThrow({ where: { username: "arian.bytyqi" }, select: { id: true, name: true } });

const browser = await chromium.launch();
const errors = [];
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(`${BASE}/hyr`, { waitUntil: "domcontentloaded" });
await page.fill('input[name="email"]', "dea.morina@student.uni-pr.edu");
await page.fill('input[type="password"]', "provoje123");
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 60_000 });

/* ------------------------------------------------------------------ */
console.log("Kërkimi te mesazhet:");

await page.goto(`${BASE}/mesazhe`, { waitUntil: "networkidle" });
const search = page.locator("main [data-people-search] input");
check("fusha e kërkimit është te faqja", (await search.count()) === 1);
check("butoni «Bisedë e re» është aty", (await page.locator("[data-new-chat]").count()) === 1);

await search.fill("arian");
const result = page.locator("main [data-people-results] button", { hasText: arian.name });
await result.first().waitFor({ timeout: 15_000 }).catch(() => {});
check("kërkimi e gjen personin me emër", (await result.count()) > 0);

await search.fill("Arian");
await page.waitForTimeout(600);
check("germat e mëdha nuk ndryshojnë gjë", (await result.count()) > 0);

await result.first().click();
await page.waitForURL(/\/mesazhe\/[^/]+$/, { timeout: 20_000 }).catch(() => {});
const conversationId = page.url().split("/mesazhe/")[1] ?? "";
check("prekja hap bisedën", conversationId.length > 5, page.url());
const members = conversationId
  ? await db.conversationMember.findMany({ where: { conversationId }, select: { userId: true } })
  : [];
check("biseda është me personin e zgjedhur", members.some((member) => member.userId === arian.id) && members.some((member) => member.userId === dea.id));

await page.goto(`${BASE}/mesazhe`, { waitUntil: "networkidle" });
await page.locator("[data-new-chat]").click();
const dialog = page.getByRole("dialog");
await dialog.waitFor();
await dialog.locator("[data-people-results] button").first().waitFor({ timeout: 15_000 }).catch(() => {});
check("«Bisedë e re» tregon shokët pa kërkuar", (await dialog.locator("[data-people-results] button").count()) > 0);
await page.keyboard.press("Escape");

await page.goto(`${BASE}/mesazhe?e-re=1`, { waitUntil: "networkidle" });
check("lidhja «?e-re=1» e hap dialogun vetë", await page.getByRole("dialog").isVisible());
await page.keyboard.press("Escape");

await page.goto(`${BASE}/feed`, { waitUntil: "networkidle" });
await page.locator("header").getByRole("button", { name: /^Mesazhe/ }).first().click();
const panelSearch = page.locator("[role=dialog] [data-people-search] input");
await panelSearch.waitFor({ timeout: 10_000 }).catch(() => {});
check("paneli i mesazheve ka kërkimin", (await panelSearch.count()) === 1);
await page.keyboard.press("Escape");

/* ------------------------------------------------------------------ */
console.log("\nFotot e mëdha:");
console.log(`       foto prove: 3000x3000, ${(bigBytes / 1024 / 1024).toFixed(1)}MB`);

await page.locator("main").getByRole("button", { name: "Çfarë po ndodh?" }).click();
const composer = page.getByRole("dialog");
await composer.waitFor();
const [chooser] = await Promise.all([
  page.waitForEvent("filechooser"),
  composer.getByRole("button", { name: "Foto / Video", exact: true }).click(),
]);
check("galeria pranon çdo foto", (await chooser.element().getAttribute("accept")).includes("image/*"));
await chooser.setFiles(bigPhoto);
const uploaded = composer.locator('img[src^="/api/media/"]');
await uploaded.first().waitFor({ timeout: 60_000 }).catch(() => {});
check("foto mbi 25MB ngarkohet", (await uploaded.count()) === 1, `origjinali ${bigBytes} bajt`);

const src = (await uploaded.first().getAttribute("src").catch(() => null)) ?? "";
const assetId = src.split("/api/media/")[1];
const asset = assetId ? await db.mediaAsset.findUnique({ where: { id: assetId } }) : null;
check("u zvogëlua në shfletues (maks. 2560px)", Boolean(asset && asset.width <= 2560 && asset.height <= 2560), JSON.stringify(asset && { w: asset.width, h: asset.height }));
check("u ruajt shumë më e lehtë se origjinali", Boolean(asset && asset.bytes < bigBytes / 2), String(asset?.bytes));
await page.keyboard.press("Escape");

check("pa gabime JavaScript", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
await db.$disconnect();

console.log(failures === 0 ? "\nTë gjitha kontrollet kaluan." : `\n${failures} kontrolle dështuan.`);
process.exit(failures === 0 ? 0 : 1);
