/**
 * Ballina e thjeshtuar dhe kompozuesi i ri.
 *
 * Shiriti i postimit ka vetëm avatarin, fushën dhe «Krijo». Filtrat janë pilula pa
 * rreshtin e shpjegimit poshtë. Shtylla e djathtë ngjitet te skaji i përmbajtjes.
 * Kompozuesi ka «Foto / Video» (një galeri e vetme) dhe «Kamera» (pamje e gjallë,
 * foto me një prekje), plus Sondazh dhe Zë. Postimi me foto nga galeria dhe nga
 * kamera del te feed-i me të dyja.
 *
 * Kamera provohet me pajisjen e rreme të Chromium-it. Krijon të dhëna prove, prandaj
 * pas tij lësho `npm run db:seed`.
 */

import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { deflateSync } from "node:zlib";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PASSWORD = "provoje123";
const EMAIL = "dea.morina@student.uni-pr.edu";
const db = new PrismaClient();

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`  ${ok ? "OK  " : "DESH"} ${label}${ok || !detail ? "" : `  (${detail})`}`);
  if (!ok) failures += 1;
}

// Një PNG 64x64 i vërtetë, i ndërtuar këtu, që serveri ta pranojë si foto.
function square(size = 64) {
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
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: size }, () => [94, 234, 212]).flat())]);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(Array.from({ length: size }, () => row)))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const PNG = square();
const dir = mkdtempSync(join(tmpdir(), "kompozuesi-"));
const photoPath = join(dir, "foto.png");
writeFileSync(photoPath, PNG);

const dea = await db.user.findFirstOrThrow({ where: { email: EMAIL }, select: { id: true } });
// Dea është vajzë në seed; një ekzekutim i ndërprerë nuk duhet ta ndryshojë këtë.
await db.user.update({ where: { id: dea.id }, data: { gender: "female" } });
const MARK = `Kompozuesi i ri ${Date.now().toString(36)}`;

const browser = await chromium.launch({
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});
const errors = [];
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
await context.grantPermissions(["camera", "microphone"], { origin: BASE });
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(`${BASE}/hyr`, { waitUntil: "domcontentloaded" });
await page.fill('input[name="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 60_000 });
await page.goto(`${BASE}/feed`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});

/* ------------------------------------------------------------------ */
console.log("Ballina:");

const trigger = page.locator("main").getByRole("button", { name: "Çfarë po ndodh?" });
check("fusha «Çfarë po ndodh?» është aty", (await trigger.count()) === 1);
const bar = trigger.locator("xpath=..");
check("shiriti ka vetëm fushën dhe «Krijo», pa ikona mediash", (await bar.locator("button").count()) === 2);
check("«Krijo» del", (await bar.getByRole("button", { name: "Krijo" }).count()) === 1);

const tabs = page.locator("nav [data-tab]");
check("katër filtrat", (await tabs.count()) === 4);
for (const label of ["Duke ndjekur", "Fakulteti im", "Universiteti im", "Kosova"]) {
  check(`filtri «${label}»`, (await tabs.filter({ hasText: label }).count()) === 1);
}
check("aktivi është «Duke ndjekur»", (await page.locator('nav [data-tab="ndjek"][aria-current="page"]').count()) === 1);
check("rreshti «Vetëm ata që i ndjek» nuk shfaqet", (await page.getByText("Vetëm ata që i ndjek, kronologjik.").count()) === 0);
// «Blu»: aktivi është pilulë e çelët me qoshe 14px dhe tekst të errët.
const active = await page.locator('nav [data-tab="ndjek"][aria-current="page"]').evaluate((node) => {
  const style = getComputedStyle(node);
  return { radius: parseFloat(style.borderRadius), background: style.backgroundColor };
});
check("filtri aktiv është pilulë e çelët", active.radius >= 12 && active.background !== "rgba(0, 0, 0, 0)", JSON.stringify(active));

// Shtylla e djathtë: ngjitet te skaji i djathtë i përmbajtjes, dhe largësia nga skaji i
// dritares është ajo e shtyllës së majtë. Shiriti i rrëshqitjes ka vendin e rezervuar
// (`scrollbar-gutter`), prandaj lejohen deri në 16px.
const board = page.locator("[data-announcement-board]").first();
const boardBox = await board.boundingBox();
const mainBox = await page.locator("main").boundingBox();
const leftBox = await page.getByRole("navigation", { name: /Navigimi kryesor/ }).boundingBox();
const width = await page.evaluate(() => window.innerWidth);
const boardRight = boardBox.x + boardBox.width;
const rightGap = width - boardRight;
check(
  "«Nga Studentët.KS» ngjitet te skaji i djathtë i përmbajtjes",
  Math.abs(boardRight - (mainBox.x + mainBox.width)) <= 1,
  `karta ${boardRight}, përmbajtja ${mainBox.x + mainBox.width}`,
);
check("pa hapësirë bosh djathtas", rightGap - leftBox.x <= 16, `djathtas ${rightGap}, majtas ${leftBox.x}`);

/* ------------------------------------------------------------------ */
console.log("\nKompozuesi:");

await trigger.click();
const dialog = page.getByRole("dialog");
await dialog.waitFor();
for (const label of ["Foto / Video", "Kamera", "Sondazh", "Zë"]) {
  check(`butoni «${label}»`, (await dialog.getByRole("button", { name: label, exact: true }).count()) === 1);
}
check("«Foto» dhe «Video» nuk janë më veç e veç", (await dialog.getByRole("button", { name: "Video", exact: true }).count()) === 0);
check("«Posto» me aeroplan letre", (await dialog.locator("[data-composer-post] svg").count()) === 1);

// Galeria: një hyrje e vetme, pranon foto dhe video.
const [chooser] = await Promise.all([
  page.waitForEvent("filechooser"),
  dialog.getByRole("button", { name: "Foto / Video", exact: true }).click(),
]);
const accept = await chooser.element().getAttribute("accept");
check("galeria pranon foto dhe video bashkë", accept.includes("image/") && accept.includes("video/"), accept);
await chooser.setFiles(photoPath);
await dialog.locator('img[src^="/api/media/"]').first().waitFor({ timeout: 30_000 });
check("fotoja nga galeria u ngarkua", (await dialog.locator('img[src^="/api/media/"]').count()) === 1);

// Kamera: pamje e gjallë, foto, rishikim, përdorim.
await dialog.getByRole("button", { name: "Kamera", exact: true }).click();
const camera = page.locator("[data-camera]");
await camera.waitFor();
await page.waitForFunction(
  () => {
    const video = document.querySelector("[data-camera] video");
    return video instanceof HTMLVideoElement && video.videoWidth > 0;
  },
  null,
  { timeout: 20_000 },
);
check("kamera hapet me pamje të gjallë", true);
await camera.locator("[data-camera-shutter]").click();
await camera.getByRole("button", { name: "Përdore" }).waitFor();
check("fotoja del për rishikim", (await camera.locator("img").count()) === 1);
await camera.getByRole("button", { name: "Përdore" }).click();
await camera.waitFor({ state: "detached" });
await page.waitForFunction(
  () => document.querySelectorAll('[role="dialog"] img[src^="/api/media/"]').length === 2,
  null,
  { timeout: 30_000 },
);
check("fotoja e kamerës hyn te postimi", true);
const tracks = await page.evaluate(() => {
  const video = document.querySelector("video");
  return video?.srcObject ? video.srcObject.getTracks().filter((track) => track.readyState === "live").length : 0;
});
check("kamera fiket pas përdorimit", tracks === 0);

await dialog.getByRole("textbox").fill(MARK);
await dialog.locator("[data-composer-post]").click();
await dialog.waitFor({ state: "detached", timeout: 30_000 });

const saved = await db.post.findFirst({ where: { authorId: dea.id, text: MARK }, select: { id: true, media: true } });
check("postimi u ruajt", Boolean(saved));
const media = saved ? JSON.parse(saved.media) : [];
check("me dy foto: galeria dhe kamera", media.length === 2 && media.every((item) => item.kind === "image"), JSON.stringify(media));

// «Duke ndjekur» tregon vetëm të tjerët; postimi i vet del te fakulteti.
await page.goto(`${BASE}/feed?tab=fakulteti`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
const card = page.locator(`[data-post-id="${saved?.id}"]`);
check("postimi del te feed-i me të dyja", (await card.locator('img[src^="/api/media/"]').count()) === 2);

await page.goto(`${BASE}/feed`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});

// Poshtë: sondazhi hapet dhe mbyllet brenda të njëjtit kompozues.
// Klikimi para hidratimit humbet: provohet derisa dritarja të hapet.
for (let attempt = 0; attempt < 5 && !(await page.getByRole("dialog").isVisible()); attempt += 1) {
  await page.locator("main").getByRole("button", { name: "Çfarë po ndodh?" }).click();
  await page.waitForTimeout(800);
}
await page.getByRole("dialog").getByRole("button", { name: "Sondazh", exact: true }).click();
check("sondazhi hap alternativat", (await page.getByRole("dialog").getByPlaceholder(/1/).count()) >= 1);
await page.keyboard.press("Escape");

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
console.log("\nAvatari pa foto:");

// Dea nuk ka foto dhe është vajzë: kudo del avatari i vajzës, i njëjti për të gjitha.
const avatarSrc = () => page.locator("header button[aria-haspopup] img").first().getAttribute("src");
check("vajza pa foto merr avatarin e vajzës", (await avatarSrc()) === "/avatars/vajze.svg", await avatarSrc());

await page.goto(`${BASE}/cilesimet`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle").catch(() => {});
const picker = page.locator("[data-gender-picker]");
check("zgjedhja e avatarit është te cilësimet", (await picker.getByRole("radio").count()) === 3);
check("«Vajzë» është e zgjedhur", (await picker.getByRole("radio", { name: "Vajzë" }).getAttribute("aria-checked")) === "true");

/** Pret derisa gjinia në bazë të bëhet ajo që pritet, sepse ruajtja shkon me server action. */
async function genderBecomes(expected) {
  let row = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    row = await db.user.findUniqueOrThrow({ where: { id: dea.id }, select: { gender: true, avatar: true } });
    if (row.gender === expected) break;
    await page.waitForTimeout(500);
  }
  return row;
}

await picker.getByRole("radio", { name: "Pa thënë" }).click();
const cleared = await genderBecomes(null);
check("«Pa thënë» ruhet si bosh", cleared.gender === null, String(cleared.gender));
check("në bazë avatari mbetet bosh", cleared.avatar === null, String(cleared.avatar));
await page.reload({ waitUntil: "networkidle" });
check("pa gjini del avatari neutral", (await avatarSrc()) === "/avatars/neutral.svg", await avatarSrc());

await page.locator("[data-gender-picker]").getByRole("radio", { name: "Vajzë" }).click();
const restored = (await genderBecomes("female")).gender;
check("kthehet te vajza", restored === "female", String(restored));

if (saved) await db.post.delete({ where: { id: saved.id } });
check("pa gabime JavaScript", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
await db.$disconnect();

console.log(failures === 0 ? "\nTë gjitha kontrollet kaluan." : `\n${failures} kontrolle dështuan.`);
process.exit(failures === 0 ? 0 : 1);
