/**
 * Gara nga ndërfaqja, me katër llogari nga universitete të ndryshme.
 *
 *   Dea     UP, e verifikuar     sfidon, luan, fiton
 *   Ardit   UBT, i verifikuar    pranon sfidën, luan, humb
 *   Arian   UP, i paverifikuar   nuk luan dot në ngjarjen e universitetit
 *   Fisnik  admin                hap ngjarjen UP kundër UBT
 *
 * Krijon të dhëna prove, prandaj pas tij lësho `npm run db:seed`.
 */

import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PASSWORD = "provoje123";
const db = new PrismaClient();

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`  ${ok ? "OK  " : "DESH"} ${label}${ok || !detail ? "" : `  (${String(detail).slice(0, 180)})`}`);
  if (!ok) failures += 1;
}

const who = async (username) =>
  db.user.findUniqueOrThrow({ where: { username }, select: { id: true, username: true, universityId: true, name: true } });
const dea = await who("dea.morina");
const ardit = await who("ardit.selimi");
const arian = await who("arian.bytyqi");
const fisnik = await who("fisnik.hoxha");

// Fillim i pastër: vetëm tabelat e garës.
await db.battle.deleteMany({});
await db.teamEvent.deleteMany({});
await db.competitionPoint.deleteMany({});
await db.competitorStats.deleteMany({});
await db.competitionEvent.deleteMany({});
await db.competitionWeek.deleteMany({});
await db.rankSnapshot.deleteMany({});
await db.universityAchievement.deleteMany({});
await db.userBadge.deleteMany({ where: { badge: { code: { startsWith: "comp_" } } } });
await db.notification.deleteMany({ where: { category: "competition" } });

const browser = await chromium.launch();
const errors = [];

async function login(user, viewport = { width: 1400, height: 950 }) {
  const phone = viewport.width < 500;
  const context = await browser.newContext({ viewport, isMobile: phone, hasTouch: phone });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${user.username} ${new URL(page.url()).pathname}: ${error.message}`));
  await page.goto(`${BASE}/hyr`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', user.username);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 45_000 });
  return page;
}

/** Luan betejën e hapur nga faqja: aq përgjigje të sakta sa kërkohen, të tjerat gabim. */
async function play(page, right) {
  const answered = [];
  for (let step = 0; step < 5; step += 1) {
    const card = page.locator("[data-question]");
    await card.waitFor({ timeout: 15_000 });
    const questionId = await card.getAttribute("data-question");
    const key = await db.quizQuestion.findUniqueOrThrow({ where: { id: questionId }, select: { correctIndex: true } });
    const choice = step < right ? key.correctIndex : (key.correctIndex + 1) % 4;
    await page.locator(`[data-option="${choice}"]`).click();
    answered.push(questionId);
    await page.waitForTimeout(1500);
  }
  await page.locator("[data-result]").waitFor({ timeout: 15_000 });
  return answered;
}

const deaPage = await login(dea);

console.log("Paneli:");
await deaPage.goto(`${BASE}/gara`, { waitUntil: "domcontentloaded" });
await deaPage.waitForTimeout(2000);
check("paneli hapet me numrat e studentit", (await deaPage.locator("[data-competition-stats] > *").count()) === 6);
check("kuizi i ditës shfaqet", (await deaPage.locator("[data-daily]").count()) === 1);
check("rregullat e pikëve shfaqen", (await deaPage.getByText("Si fitohen pikët").count()) === 1);

console.log("Sfida:");
await deaPage.getByRole("button", { name: "Të gjitha" }).first().click();
await deaPage.locator('[data-category="economics"]').click();
await deaPage.getByRole("button", { name: "Sfido një shok" }).first().click();
await deaPage.getByRole("dialog").getByPlaceholder("Kërko me emër ose @username").fill("ardit");
await deaPage.waitForTimeout(1200);
await deaPage.getByRole("dialog").getByRole("button", { name: `Dërgo sfidën: ${ardit.name}` }).click();
await deaPage.waitForURL(/\/gara\/beteja\//, { timeout: 15_000 });
const battleId = deaPage.url().split("/").pop();
const battle = await db.battle.findUnique({ where: { id: battleId }, select: { mode: true, status: true, category: true } });
check("sfida u krijua në kategorinë e zgjedhur", battle?.mode === "challenge" && battle.category === "economics", JSON.stringify(battle));
check(
  "Ardit mori njoftimin e sfidës",
  (await db.notification.count({ where: { userId: ardit.id, type: "battle_challenge", targetId: battleId } })) === 1,
);

await deaPage.locator("[data-start]").click();
const deaQuestions = await play(deaPage, 5);
check("Dea mbaroi me 5/5", ((await deaPage.locator("[data-score]").textContent()) ?? "").includes("5/5"));

console.log("Pranimi dhe loja e kundërshtarit:");
const arditPage = await login(ardit);
await arditPage.goto(`${BASE}/njoftimet`, { waitUntil: "domcontentloaded" });
await arditPage.waitForTimeout(1500);
check("njoftimi del te faqja e njoftimeve", (await arditPage.getByText(/të sfidoi në një betejë Ekonomi/).count()) > 0);
await arditPage.goto(`${BASE}/gara/beteja/${battleId}`, { waitUntil: "domcontentloaded" });
await arditPage.getByRole("button", { name: "Prano" }).click();
await arditPage.locator("[data-start]").waitFor({ timeout: 10_000 });
await arditPage.locator("[data-start]").click();
const arditQuestions = await play(arditPage, 3);
check("të dy morën të njëjtat pyetje, në të njëjtin rend", JSON.stringify(deaQuestions) === JSON.stringify(arditQuestions));
check("Ardit mbaroi me 3/5", ((await arditPage.locator("[data-score]").textContent()) ?? "").includes("3/5"));
await arditPage.waitForTimeout(1500);
check("Ardit sheh që fitoi Dea", (await arditPage.getByText(/Fitoi Dea/).count()) > 0);

// Dea nuk e rifreskon faqen: rezultati vjen vetë.
await deaPage.waitForTimeout(5000);
check("Dea e sheh fitoren pa rifreskim", (await deaPage.getByText("Fitove!").count()) > 0);

const finished = await db.battle.findUnique({ where: { id: battleId }, select: { status: true, winnerId: true } });
check("fituesi u caktua saktë", finished?.status === "finished" && finished.winnerId === dea.id);
const deaPoints = await db.competitionPoint.findMany({ where: { userId: dea.id }, select: { source: true, points: true, universityId: true } });
check(
  "Dea mori pikë për pjesëmarrjen dhe fitoren, për UP",
  deaPoints.length === 2 && deaPoints.every((row) => row.universityId === dea.universityId),
  JSON.stringify(deaPoints),
);
check(
  "Ardit mori pikë pjesëmarrjeje për UBT",
  (await db.competitionPoint.count({ where: { userId: ardit.id, source: "battle_complete", universityId: ardit.universityId } })) === 1,
);
check(
  "njoftimet e rezultatit dhe të arritjes",
  (await db.notification.count({ where: { userId: dea.id, type: { in: ["battle_accepted", "battle_finished", "achievement_unlocked"] } } })) >= 3,
);

console.log("Kuizi i ditës:");
await deaPage.goto(`${BASE}/gara`, { waitUntil: "domcontentloaded" });
await deaPage.getByRole("link", { name: "Nis kuizin" }).click();
await deaPage.waitForURL(/\/gara\/beteja\//);
const dailyId = deaPage.url().split("/").pop();
await deaPage.locator("[data-start]").click();
await play(deaPage, 4);
await deaPage.reload({ waitUntil: "domcontentloaded" });
await deaPage.waitForTimeout(1500);
check("kuizi i ditës nuk nis dot sërish", (await deaPage.locator("[data-start]").count()) === 0);
const dailyPoints = await db.competitionPoint.findMany({ where: { userId: dea.id, source: "daily_quiz" } });
check("kuizi i ditës dha pikë një herë, 2 për çdo të saktë", dailyPoints.length === 1 && dailyPoints[0].points === 8, JSON.stringify(dailyPoints));
check("kuizi i ditës është i njëjti për të gjithë", (await db.battle.count({ where: { mode: "daily" } })) === 1 && Boolean(dailyId));

console.log("Renditjet:");
await deaPage.goto(`${BASE}/gara/renditja`, { waitUntil: "domcontentloaded" });
check("Dea është e para te renditja e studentëve", (await deaPage.locator("[data-leader]").first().getAttribute("data-leader")) === dea.username);
await deaPage.goto(`${BASE}/gara/renditja?scope=university`, { waitUntil: "domcontentloaded" });
check("«Universiteti im» tregon vetëm studentët e UP", (await deaPage.locator(`[data-leader="${ardit.username}"]`).count()) === 0);
await deaPage.goto(`${BASE}/gara/renditja?tab=universitetet&period=all`, { waitUntil: "domcontentloaded" });
const unis = await deaPage.locator("[data-university]").evaluateAll((rows) => rows.map((row) => row.getAttribute("data-university")));
check("UP e para, UBT e dyta te renditja e universiteteve", unis[0] === "UP" && unis[1] === "UBT", unis.join(","));

await deaPage.goto(`${BASE}/gara/universiteti/up`, { waitUntil: "domcontentloaded" });
check("paneli i garës së universitetit", (await deaPage.locator('[data-university-panel="UP"]').count()) === 1 && (await deaPage.getByText("#1").count()) > 0);

await deaPage.goto(`${BASE}/gara/arritjet`, { waitUntil: "domcontentloaded" });
check("arritja «Fitorja e parë» është e hapur", (await deaPage.locator('[data-achievement="comp_first_win"][data-unlocked="true"]').count()) === 1);
await deaPage.goto(`${BASE}/u/${dea.username}`, { waitUntil: "domcontentloaded" });
check("arritja del si badge te koka e profilit", (await deaPage.locator('[data-profile-badges] [aria-label="Fitorja e parë"]').count()) > 0);

console.log("Ngjarja mes universiteteve:");
const adminPage = await login(fisnik);
await adminPage.goto(`${BASE}/admin/gara`, { waitUntil: "domcontentloaded" });
await adminPage.fill("#event-title", "UP kundër UBT, Ekonomi");
await adminPage.selectOption("#event-category", "economics");
const upId = dea.universityId;
const ubtId = ardit.universityId;
await adminPage.selectOption("#event-a", upId);
await adminPage.selectOption("#event-b", ubtId);
await adminPage.fill("#event-hours", "2");
await adminPage.getByRole("button", { name: "Hap ngjarjen" }).click();
await adminPage.waitForTimeout(2500);
const event = await db.teamEvent.findFirst({ where: { title: "UP kundër UBT, Ekonomi" }, select: { id: true } });
check("admini e hapi ngjarjen", Boolean(event));

await deaPage.goto(`${BASE}/gara/ngjarje/${event.id}`, { waitUntil: "domcontentloaded" });
await deaPage.locator("[data-play-event]").click();
await deaPage.waitForURL(/\/gara\/beteja\//);
await play(deaPage, 4);

await arditPage.goto(`${BASE}/gara/ngjarje/${event.id}`, { waitUntil: "domcontentloaded" });
await arditPage.locator("[data-play-event]").click();
await arditPage.waitForURL(/\/gara\/beteja\//);
await play(arditPage, 2);

const arianPage = await login(arian);
await arianPage.goto(`${BASE}/gara/ngjarje/${event.id}`, { waitUntil: "domcontentloaded" });
check(
  "studenti i paverifikuar nuk luan për universitetin",
  (await arianPage.locator("[data-play-event]").count()) === 0 && (await arianPage.getByText(/studentët e verifikuar/).count()) > 0,
);

await deaPage.goto(`${BASE}/gara/ngjarje/${event.id}`, { waitUntil: "domcontentloaded" });
const liveUp = await deaPage.locator('[data-score="UP"]').textContent();
const liveUbt = await deaPage.locator('[data-score="UBT"]').textContent();
check("rezultati i drejtpërdrejtë: UP 12, UBT 6", liveUp === "12" && liveUbt === "6", `${liveUp} / ${liveUbt}`);

await db.teamEvent.update({ where: { id: event.id }, data: { endsAt: new Date(Date.now() - 1000) } });
await deaPage.reload({ waitUntil: "domcontentloaded" });
check("ngjarja mbyllet me fitues pas afatit", (await deaPage.getByText("Fitoi UP").count()) > 0);
check(
  "fitorja ruhet te arritjet e universitetit",
  (await db.universityAchievement.count({ where: { code: "event_winner", period: event.id, universityId: upId } })) === 1,
);
await deaPage.goto(`${BASE}/gara/historia`, { waitUntil: "domcontentloaded" });
check("historia i ruan betejat dhe ngjarjen", (await deaPage.locator("[data-my-battles] li").count()) >= 3 && (await deaPage.getByText("UP kundër UBT, Ekonomi").count()) > 0);

console.log("Feed-i i garës:");
await deaPage.goto(`${BASE}/gara`, { waitUntil: "domcontentloaded" });
check("«Dea fitoi një betejë» del te feed-i", (await deaPage.locator("[data-competition-feed]").getByText(/fitoi një betejë Ekonomi/).count()) > 0);

console.log("Hyrjet:");
await deaPage.goto(`${BASE}/komuniteti`, { waitUntil: "domcontentloaded" });
check("karta e garës te Komuniteti", (await deaPage.locator("[data-competition-card]").count()) === 1);

console.log("Celulari:");
const phone = await login(dea, { width: 390, height: 844 });
for (const path of ["/gara", `/gara/beteja/${battleId}`, "/gara/renditja"]) {
  await phone.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await phone.waitForTimeout(1200);
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(`pa rrëshqitje anash te ${path}`, !overflow);
}

check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
if (errors.length) console.log(errors.slice(0, 3));

await browser.close();
await db.$disconnect();
console.log(failures ? `\n${failures} kontrolle dështuan.` : "\nTë gjitha kontrollet kaluan.");
process.exit(failures ? 1 : 0);
