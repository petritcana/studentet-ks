/**
 * Provë në shfletues për dhomën e zërit, me zë të vërtetë.
 *
 * Dy shfletues me mikrofon të rremë (Chromium lëshon një ton provë). Erza hap
 * dhomën, Fisniku hyn si dëgjues: zëri i Erzës duhet t'i arrijë përmes WebRTC dhe
 * unaza e saj duhet të ndizet te ekrani i tij. Pastaj heshtja, bërja folës, një
 * skedar në bisedë dhe largimi nga pritësi. Krijon të dhëna prove: pas tij
 * `npm run db:seed`.
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

const [erza, fisnik] = await Promise.all([
  db.user.findUniqueOrThrow({ where: { username: "erza.krasniqi" } }),
  db.user.findUniqueOrThrow({ where: { username: "fisnik.hoxha" } }),
]);

await db.voiceRoom.updateMany({ where: { hostId: erza.id, status: "live" }, data: { status: "ended", endedAt: new Date() } });
const room = await db.voiceRoom.create({
  data: {
    hostId: erza.id,
    title: "Përsëritje e Anatomisë",
    scope: "university",
    universityId: erza.universityId,
    status: "live",
    access: "open",
  },
});

const browser = await chromium.launch({
  args: [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const errors = [];

async function signIn(email) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ["microphone"] });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${email}: ${error.message}`));
  await page.goto(`${BASE}/hyr`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[type="password"]', "provoje123");
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 30_000 });
  return page;
}

async function enter(page) {
  await page.goto(`${BASE}/zeri/${room.id}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Hyr" }).click();
  await page.locator("[data-seat]").first().waitFor({ timeout: 15_000 });
}

const host = await signIn("erza.krasniqi@student.uni-pr.edu");
const guest = await signIn("fisnik.hoxha@student.uni-pr.edu");

console.log("Hyrja:");
await enter(host);
await enter(guest);
check("pritësi ka mikrofonin të ndezur", (await host.locator('[data-voice-mic="on"]').count()) === 1);
check("dëgjuesi ka dorën, jo mikrofonin", (await guest.locator("[data-voice-mic]").count()) === 0);

// Avatari mbush rrethin: korniza është katror, jo ovale.
const frame = await guest.locator(`[data-seat="${erza.username}"] > span`).first().boundingBox();
check("avatari rri drejt në rreth", Boolean(frame) && Math.abs(frame.width - frame.height) < 1, frame ? `${frame.width}x${frame.height}` : "");

console.log("Zëri:");
const heard = await guest
  .waitForFunction(
    (id) => {
      const audio = document.querySelector(`audio[data-voice-peer="${id}"]`);
      return Boolean(audio && audio.srcObject && audio.srcObject.getAudioTracks().length > 0);
    },
    erza.id,
    { timeout: 30_000 },
  )
  .then(() => true)
  .catch(() => false);
check("zëri i pritësit arrin te dëgjuesi", heard);

const lit = await guest
  .locator(`[data-seat="${erza.username}"][data-speaking="true"]`)
  .waitFor({ timeout: 15_000 })
  .then(() => true)
  .catch(() => false);
check("unaza e pritësit ndizet kur flet", lit);

await host.locator("[data-voice-mic]").click();
check("heshtja e kthen butonin në të kuq me vijë", (await host.locator('[data-voice-mic="off"]').count()) === 1);
const quiet = await guest
  .locator(`[data-seat="${erza.username}"][data-speaking="false"]`)
  .waitFor({ timeout: 8_000 })
  .then(() => true)
  .catch(() => false);
check("i heshturi nuk ndizet më", quiet);
await host.locator("[data-voice-mic]").click();

console.log("Pritësi:");
await host.locator(`[data-seat="${fisnik.username}"] [data-seat-menu]`).waitFor({ timeout: 10_000 });
await host.locator(`[data-seat="${fisnik.username}"] [data-seat-menu]`).click();
await host.getByRole("menuitem", { name: "Bëje folës" }).click();
const promoted = await guest
  .locator("[data-voice-mic]")
  .waitFor({ timeout: 10_000 })
  .then(() => true)
  .catch(() => false);
check("i bëri folës merr mikrofonin", promoted);

console.log("Biseda:");
const pdf = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");
await host.locator("[data-attach-menu]").click();
check("menyja e dhomës ka foto, kamerë dhe skedar", (await host.locator("[data-attach]").count()) === 3);
await host.keyboard.press("Escape");
await host.locator("[data-document-input]").setInputFiles({ name: "Skema.pdf", mimeType: "application/pdf", buffer: pdf });
await host.locator('[data-attachment="file"]').waitFor({ timeout: 10_000 });
await host.getByPlaceholder("Shkruaj diçka").fill("Skema për sot");
await host.getByPlaceholder("Shkruaj diçka").press("Enter");
const fileSeen = await guest
  .locator("[data-room-message] [data-file-card]")
  .waitFor({ timeout: 10_000 })
  .then(() => true)
  .catch(() => false);
check("skedari del te biseda e dhomës", fileSeen);

console.log("Largimi:");
await host.locator(`[data-seat="${fisnik.username}"] [data-seat-menu]`).click();
await host.locator("[data-seat-remove]").click();
await host.locator("[data-seat-remove-confirm]").click();
const kicked = await guest
  .waitForURL((url) => url.pathname === "/feed", { timeout: 10_000 })
  .then(() => true)
  .catch(() => false);
check("i larguari del nga dhoma", kicked);
const seat = await db.voiceParticipant.findUnique({ where: { roomId_userId: { roomId: room.id, userId: fisnik.id } } });
check("largimi shënohet në server", Boolean(seat?.removedAt));
await guest.goto(`${BASE}/zeri/${room.id}`, { waitUntil: "networkidle" });
await guest.getByRole("button", { name: "Hyr" }).click();
await guest.waitForTimeout(2000);
check("nuk hyn dot përsëri", (await guest.locator("[data-seat]").count()) === 0);

console.log("Ftesa:");
// Dhoma bëhet me fjalëkalim: ftesa e pritësit duhet ta hapë derën pa të.
const dea = await db.user.findUniqueOrThrow({ where: { username: "dea.morina" } });
await db.follow.upsert({
  where: { followerId_followingId: { followerId: erza.id, followingId: dea.id } },
  create: { followerId: erza.id, followingId: dea.id, status: "accepted" },
  update: { status: "accepted" },
});
await db.voiceRoom.update({ where: { id: room.id }, data: { access: "password", passwordHash: "x" } });
await host.locator("[data-voice-invite]").click();
await host.locator("[data-voice-invite-search]").fill("dea");
const row = host.locator(`[data-invitee="${dea.username}"]`);
await row.waitFor({ timeout: 10_000 });
await row.getByRole("button", { name: "Fto" }).click();
await row.getByRole("button", { name: /U ftua/ }).waitFor({ timeout: 10_000 });
const note = await db.notification.findFirst({ where: { userId: dea.id, type: "voice_invite", targetId: room.id } });
check("i ftuari merr njoftim", Boolean(note));
await host.keyboard.press("Escape");

const invitee = await signIn("dea.morina@student.uni-pr.edu");
const list = await invitee.request.get(`${BASE}/api/njoftimet`);
const items = (await list.json().catch(() => ({}))).items ?? [];
check("njoftimi të çon te dhoma", items.some((item) => item.type === "voice_invite" && item.href === `/zeri/${room.id}`));
await enter(invitee);
check("ftesa e pritësit hap dhomën me fjalëkalim", (await invitee.locator(`[data-seat="${dea.username}"]`).count()) === 1);

check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
if (errors.length) console.log(errors.join("\n"));

await db.voiceRoom.update({ where: { id: room.id }, data: { status: "ended", endedAt: new Date() } });
await browser.close();
await db.$disconnect();
console.log(failures === 0 ? "Të gjitha kontrollet kaluan." : `${failures} kontrolle dështuan.`);
process.exit(failures === 0 ? 0 : 1);
