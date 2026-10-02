/**
 * Grupet, thirrjet dhe ndjekja mbrapsht.
 *
 * Erza është admini i «Grupi i Statistikës», Dea anëtare. Kalon: anëtarët me
 * rolin te cilësimet, linqet e ndaluara, biseda e ndalur (vetëm adminët),
 * admini i ri, thirrja që e nis vetëm admini dhe ku Dea hyn vetë, zëri dhe
 * pamja me kamerë mes dy shfletuesve në bisedën me dy veta, mbyllja për të
 * gjithë, dhe «Ndiqe edhe ti» te njoftimi pas pranimit të kërkesës.
 *
 * Shfletuesi merr mikrofon e kamerë prove. Krijon të dhëna prove, prandaj pas
 * tij `npm run db:seed`.
 */

import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = process.argv[2] ?? "http://localhost:3000";
const db = new PrismaClient();

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`  ${ok ? "OK  " : "DESH"} ${label}${ok || !detail ? "" : `  (${detail})`}`);
  if (!ok) failures += 1;
}

const erza = await db.user.findUniqueOrThrow({ where: { username: "erza.krasniqi" } });
const dea = await db.user.findFirstOrThrow({ where: { email: "dea.morina@student.uni-pr.edu" } });
const group = await db.conversation.findFirstOrThrow({ where: { type: "group", title: "Grupi i Statistikës" } });
await db.conversation.update({ where: { id: group.id }, data: { adminsOnly: false, allowLinks: true } });
await db.conversationMember.upsert({
  where: { conversationId_userId: { conversationId: group.id, userId: dea.id } },
  create: { conversationId: group.id, userId: dea.id, role: "member" },
  update: { role: "member", isAccepted: true, mutedUntil: null },
});
await db.conversationMember.update({
  where: { conversationId_userId: { conversationId: group.id, userId: erza.id } },
  data: { role: "admin", isAccepted: true },
});
await db.chatCall.updateMany({ where: { endedAt: null }, data: { endedAt: new Date() } });

const browser = await chromium.launch({
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
});
const errors = [];

/**
 * Sa zë arrin vërtet te tjetri: niveli më i lartë i zërit që luan elementi i tij
 * gjatë tri sekondave. Pajisja e rreme e Chrome-it lëshon një ton; heshtja jep 0.
 */
async function loudness(page) {
  return page.evaluate(async () => {
    const audio = document.querySelector("audio[data-voice-peer]");
    if (!audio?.srcObject) return 0;
    const context = new AudioContext();
    await context.resume();
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    context.createMediaStreamSource(audio.srcObject).connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);
    let max = 0;
    const until = performance.now() + 3000;
    while (performance.now() < until) {
      analyser.getFloatTimeDomainData(buffer);
      let sum = 0;
      for (const value of buffer) sum += value * value;
      max = Math.max(max, Math.sqrt(sum / buffer.length));
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    await context.close();
    return max;
  });
}
const HEARD = 0.01;

async function signIn(username) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "sq", permissions: ["microphone", "camera"] });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${username}: ${error.message}`));
  await page.goto(`${BASE}/hyr`);
  await page.fill('input[name="email"]', username);
  await page.fill('input[name="password"]', "provoje123");
  await page.locator("[data-login-submit]").click();
  await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 45_000 });
  return page;
}

const admin = await signIn(erza.username);
const member = await signIn(dea.username);
const groupUrl = `${BASE}/mesazhe/${group.id}`;

console.log("Anëtarët dhe rregullat:");
await member.goto(groupUrl, { waitUntil: "networkidle" });
check("anëtari nuk ka butonat e thirrjes", (await member.locator("[data-call-start]").count()) === 0);
await member.locator("[data-chat-settings-open]").click();
await member.locator("[data-group-members]").waitFor();
check("cilësimet tregojnë anëtarët", (await member.locator("[data-member]").count()) >= 3);
check("Erza del si Admin", (await member.locator(`[data-member="${erza.username}"]`).innerText()).includes("Admin"));
check("anëtari nuk i ndryshon rregullat", await member.locator('[data-rule="allow-links"]').isDisabled());
await member.keyboard.press("Escape");

await admin.goto(groupUrl, { waitUntil: "networkidle" });
check("admini i ka butonat e thirrjes", (await admin.locator("[data-call-start]").count()) === 2);
await admin.locator("[data-chat-settings-open]").click();
await admin.locator('[data-rule="allow-links"]').click();
await admin.waitForTimeout(1500);
check("admini i ndalon linqet", (await db.conversation.findUnique({ where: { id: group.id } })).allowLinks === false);
await admin.keyboard.press("Escape");

await member.reload({ waitUntil: "networkidle" });
const linkText = `Shiko këtu www.shembull.com/${Date.now().toString(36)}`;
await member.locator("textarea").fill(linkText);
await member.keyboard.press("Enter");
await member.waitForTimeout(1500);
check("linku nuk kalon te anëtari", (await db.message.count({ where: { conversationId: group.id, text: linkText } })) === 0);
check("anëtari e sheh arsyen", (await member.getByText("Linqet janë të ndaluara").count()) >= 1);

await admin.locator("[data-chat-settings-open]").click();
await admin.locator('[data-rule="admins-only"]').click();
await admin.waitForTimeout(1500);
check("admini e ndal bisedën", (await db.conversation.findUnique({ where: { id: group.id } })).adminsOnly === true);
await member.waitForTimeout(4500);
check("anëtari sheh «vetëm adminët shkruajnë»", (await member.locator("[data-chat-locked]").count()) === 1 && (await member.locator("textarea").count()) === 0);
await admin.locator('[data-rule="admins-only"]').click();
await admin.locator('[data-rule="allow-links"]').click();
await admin.waitForTimeout(1500);

await admin.locator(`[data-member="${dea.username}"] [data-member-menu]`).click();
await admin.locator("[data-make-admin]").click();
await admin.waitForTimeout(1500);
check("admini e bën Dean admin", (await db.conversationMember.findFirst({ where: { conversationId: group.id, userId: dea.id } })).role === "admin");
await db.conversationMember.updateMany({ where: { conversationId: group.id, userId: dea.id }, data: { role: "member" } });
await admin.keyboard.press("Escape");

console.log("\nThirrja në grup:");
await member.reload({ waitUntil: "networkidle" });
await admin.reload({ waitUntil: "networkidle" });
await admin.locator('[data-call-start="audio"]').click();
await admin.locator("[data-call-view]").waitFor({ timeout: 10_000 });
check("admini hap thirrjen", (await admin.locator("[data-call-view]").count()) === 1);
await member.locator("[data-call-banner]").waitFor({ timeout: 10_000 }).catch(() => {});
check("anëtari e sheh thirrjen dhe vendos vetë", (await member.locator("[data-call-join]").count()) === 1);
check("njoftimi i thirrjes shkoi te Dea", (await db.notification.count({ where: { userId: dea.id, type: "call_audio" } })) >= 1);
await member.locator("[data-call-join]").click();
await member.locator("[data-call-view]").waitFor({ timeout: 10_000 });
await admin.waitForFunction(() => document.querySelectorAll("[data-call-tile]").length === 2, null, { timeout: 15_000 }).catch(() => {});
check("të dy brenda thirrjes", (await admin.locator("[data-call-tile]").count()) === 2);
const audioFlows = await member
  .waitForFunction(() => [...document.querySelectorAll("audio[data-voice-peer]")].some((audio) => audio.srcObject && !audio.paused), null, { timeout: 20_000 })
  .then(() => true)
  .catch(() => false);
check("zëri i adminit arrin te Dea", audioFlows);
check("vetëm admini e mbyll për të gjithë", (await member.locator("[data-call-end-all]").count()) === 0 && (await admin.locator("[data-call-end-all]").count()) === 1);
await admin.locator("[data-call-end-all]").click();
await member.locator("[data-call-view]").waitFor({ state: "detached", timeout: 10_000 }).catch(() => {});
check("thirrja mbyllet te të gjithë", (await member.locator("[data-call-view]").count()) === 0);

console.log("\nZilja kudo, pranimi dhe kontrollet:");
let direct = await db.conversation.findFirst({
  where: { type: "direct", AND: [{ members: { some: { userId: erza.id } } }, { members: { some: { userId: dea.id } } }] },
});
direct ??= await db.conversation.create({ data: { type: "direct", members: { create: [{ userId: erza.id }, { userId: dea.id }] } } });
await db.conversationMember.updateMany({ where: { conversationId: direct.id }, data: { isAccepted: true, mutedUntil: null } });
await member.goto(`${BASE}/mesazhe/${direct.id}`, { waitUntil: "networkidle" });
// Erza është gjetkë në platformë, jo te biseda.
await admin.goto(`${BASE}/materialet`, { waitUntil: "networkidle" });
check("te biseda me dy veta thërret kushdo", (await member.locator("[data-call-start]").count()) === 2);

await member.locator('[data-call-start="audio"]').click();
await member.locator("[data-call-view]").waitFor({ timeout: 10_000 });
await member.waitForTimeout(1500);
check("thirrësi sheh «Po i bie ziles»", (await member.locator("[data-call-status]").innerText()).includes("Po i bie ziles"));
await admin.locator("[data-incoming-call]").waitFor({ timeout: 10_000 }).catch(() => {});
check("zilja del te faqja ku është Erza", (await admin.locator("[data-incoming-call]").count()) === 1);
check(
  "«Prano» e gjelbër, «Refuzo» e kuqe",
  (await admin.locator("[data-call-accept]").getAttribute("class")).includes("bg-success") &&
    (await admin.locator("[data-call-decline]").getAttribute("class")).includes("bg-danger"),
);
await admin.locator("[data-call-accept]").click();
await admin.locator("[data-call-view]").waitFor({ timeout: 10_000 });
check("pranimi hap dritaren e thirrjes mbi faqe", admin.url().includes("/materialet") && (await admin.locator("[data-call-view]").count()) === 1);
const heard = await admin
  .waitForFunction(() => [...document.querySelectorAll("audio[data-voice-peer]")].some((audio) => audio.srcObject && !audio.paused), null, { timeout: 20_000 })
  .then(() => true)
  .catch(() => false);
check("zëri i Deas arrin te Erza", heard);

let level = await loudness(admin);
check("vetëm me mikrofon: zëri i Deas dëgjohet", level > HEARD, level.toFixed(3));

// Altoparlanti dhe veshi: zëri nuk heshtet, vetëm ndryshon dalja.
const output = () =>
  admin.evaluate(() => [...document.querySelectorAll("audio[data-voice-peer]")].map((audio) => `${audio.dataset.output}:${audio.volume}:${audio.muted}`).join(","));
check("në kompjuter nis në altoparlant", (await output()).startsWith("speaker:1:false"), await output());
await admin.locator('[data-call-control="speaker"]').click();
await admin.waitForTimeout(300);
check("«te veshi»: zëri i ulët, jo i heshtur", (await output()).startsWith("earpiece:") && (await output()).endsWith(":false"), await output());
check("butoni e thotë gjendjen", (await admin.locator('[data-call-control="speaker"]').getAttribute("data-state")) === "earpiece");
level = await loudness(admin);
check("te veshi zëri prapë arrin", level > HEARD, level.toFixed(3));
await admin.locator('[data-call-control="speaker"]').click();
await admin.waitForTimeout(300);
check("dhe kthehet në altoparlant", (await output()).startsWith("speaker:1:false"), await output());

// Kamera ndizet në mes të thirrjes zanore dhe Erza e sheh.
await member.locator('[data-call-control="camera"]').click();
const remoteVideo = await admin
  .waitForFunction(
    (id) => {
      const video = document.querySelector(`[data-call-tile="${id}"] video`);
      return Boolean(video && video.videoWidth > 0 && !video.classList.contains("invisible"));
    },
    dea.id,
    { timeout: 25_000 },
  )
  .then(() => true)
  .catch(() => false);
check("kamera e ndezur në thirrje zanore shihet te Erza", remoteVideo);
const resolution = await member.evaluate(() => {
  const video = document.querySelector('[data-call-tile="me"] video');
  return video ? `${video.videoWidth}x${video.videoHeight}` : "";
});
check("kamera merr rezolucionin e pajisjes", resolution !== "" && resolution !== "0x0", resolution);
level = await loudness(admin);
check("me kamerën ndezur zëri i Deas prapë dëgjohet", level > HEARD, level.toFixed(3));
check(
  "me dy veta: tjetri në tërë ekranin, pamja e plotë pa prerje",
  (await admin.locator(`[data-call-stage] [data-call-tile="${dea.id}"] video.object-contain`).count()) === 1,
);
check("unë dal i vogël në qoshe", (await member.locator('[data-call-stage] [data-call-tile="me"]').count()) === 1);
check("video nuk e mban zërin: zëri vetëm te elementi i vet", await admin.evaluate(() => [...document.querySelectorAll("[data-call-tile] video")].every((video) => !video.srcObject || video.srcObject.getAudioTracks().length === 0)));

// Kamera kthehet nga Erza: të dy flasin me kamera, pastaj e fikin.
await admin.locator('[data-call-control="camera"]').click();
await admin.waitForTimeout(2500);
level = await loudness(member);
check("kur Erza ndez kamerën, Dea e dëgjon Erzën", level > HEARD, level.toFixed(3));
level = await loudness(admin);
check("dhe Erza e dëgjon Dean", level > HEARD, level.toFixed(3));
await admin.locator('[data-call-control="camera"]').click();

await member.locator('[data-call-control="camera"]').click();
check("kamera fiket me një prekje", (await member.locator('[data-call-control="camera"][aria-pressed="true"]').count()) === 1);
const backToAvatar = await admin
  .waitForFunction(
    (id) => {
      const tile = document.querySelector(`[data-call-tile="${id}"]`);
      const video = tile?.querySelector("video");
      return Boolean(tile && video && video.classList.contains("invisible") && tile.querySelector("img, [data-avatar], span"));
    },
    dea.id,
    { timeout: 15_000 },
  )
  .then(() => true)
  .catch(() => false);
check("kamera e fikur: te tjetri del fotoja, jo kuadri i fundit i ngrirë", backToAvatar);
await member.waitForTimeout(1500);
level = await loudness(admin);
check("pas fikjes së kamerës zëri vazhdon", level > HEARD, level.toFixed(3));
await member.locator('[data-call-control="mic"]').click();
check("mikrofoni heshtet", (await member.locator('[data-call-control="mic"][aria-pressed="true"]').count()) === 1);
await member.waitForTimeout(800);
level = await loudness(admin);
check("me mikrofonin e heshtur nuk arrin asgjë", level < HEARD, level.toFixed(3));
await member.locator('[data-call-control="mic"]').click();
await member.waitForTimeout(800);
level = await loudness(admin);
check("mikrofoni i ndezur prapë: zëri kthehet", level > HEARD, level.toFixed(3));

await admin.locator("[data-call-minimize]").click();
await admin.locator("[data-call-mini]").waitFor({ timeout: 5000 });
await admin.getByRole("link", { name: "Ballina" }).first().click();
await admin.waitForURL((url) => url.pathname.startsWith("/feed"), { timeout: 15_000 });
await admin.waitForTimeout(1500);
check("thirrja vazhdon si pilulë kur Erza ndërron faqe", (await admin.locator("[data-call-mini]").count()) === 1);
const stillHeard = await admin.evaluate(() => [...document.querySelectorAll("audio[data-voice-peer]")].some((audio) => audio.srcObject && !audio.paused));
check("zëri nuk ndalet gjatë shëtitjes", stillHeard);
await admin.locator("[data-call-expand]").click();
check("prekja e pilulës e kthen dritaren e thirrjes", (await admin.locator("[data-call-view]").count()) === 1);
await admin.locator("[data-call-leave]").click();
await member.locator("[data-call-view]").waitFor({ state: "detached", timeout: 10_000 }).catch(() => {});
check("kur njëri mbyll, thirrja mbaron për të dy", (await member.locator("[data-call-view]").count()) === 0);
await member.waitForTimeout(4000);
check("në bisedë mbetet rreshti i thirrjes", (await member.locator("[data-call-line]").count()) >= 1);

console.log("\nRefuzimi:");
await member.locator('[data-call-start="video"]').click();
await member.locator("[data-call-view]").waitFor({ timeout: 10_000 });
await admin.locator("[data-incoming-call]").waitFor({ timeout: 10_000 }).catch(() => {});
check("video thirrja i bie Erzës", (await admin.locator("[data-incoming-call]").innerText()).includes("Video"));
await admin.locator("[data-call-decline]").click();
check("zilja ikën pas refuzimit", (await admin.locator("[data-incoming-call]").count()) === 0);
await member.locator("[data-call-view]").waitFor({ state: "detached", timeout: 10_000 }).catch(() => {});
check("thirrësi e sheh që u refuzua", (await member.locator("[data-call-view]").count()) === 0 && (await member.getByText("E refuzoi thirrjen").count()) >= 1);

console.log("\nNdiqe edhe ti:");
const lirim = await db.user.findFirstOrThrow({ where: { username: { not: erza.username }, role: "student", passwordHash: { not: null }, id: { not: dea.id } } });
await db.follow.deleteMany({ where: { OR: [{ followerId: lirim.id, followingId: erza.id }, { followerId: erza.id, followingId: lirim.id }] } });
await db.notification.deleteMany({ where: { userId: erza.id, actorId: lirim.id } });
await db.user.update({ where: { id: erza.id }, data: { isPrivate: true } }).catch(() => undefined);
await db.follow.create({ data: { followerId: lirim.id, followingId: erza.id, status: "pending" } });
await db.notification.create({ data: { userId: erza.id, category: "social", type: "follow_request", actorId: lirim.id, targetId: erza.id, payload: "{}" } });
await admin.goto(`${BASE}/feed`, { waitUntil: "networkidle" });
await admin.getByRole("button", { name: /Njoftimet/ }).first().click();
const row = admin.locator("li").filter({ hasText: lirim.name }).first();
await row.getByRole("button", { name: "Prano" }).click();
await row.locator("[data-follow-back]").waitFor({ timeout: 8000 }).catch(() => {});
check("pas pranimit del «Ndiqe edhe ti»", (await row.locator("[data-follow-back]").count()) === 1);
await row.locator("[data-follow-back]").click();
await admin.waitForTimeout(2500);
check("ndjekja mbrapsht u krijua", (await db.follow.count({ where: { followerId: erza.id, followingId: lirim.id } })) === 1);
await db.user.update({ where: { id: erza.id }, data: { isPrivate: false } }).catch(() => undefined);

check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
if (errors.length) console.log(errors.join("\n"));

await browser.close();
await db.$disconnect();
console.log(failures === 0 ? "\nTë gjitha kontrollet kaluan." : `\n${failures} kontrolle dështuan.`);
process.exit(failures === 0 ? 0 : 1);
