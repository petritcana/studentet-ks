/**
 * Hyrja e studentit, nga regjistrimi te ballina.
 *
 * Kalon tetë rastet që duhet të mbajnë gjithmonë:
 *
 *   A  kolegj privat: institucion, program, pa fakultet
 *   B  UBT, Stomatologji, dy nivele te i njëjti program
 *   C  universitet publik: fakulteti para programit
 *   D  Gjilan: programet filtrohen nga fakulteti
 *   E  fotoja e profilit ruhet si avatar
 *   F  qyteti kërkohet mes mbi 30 vendbanimeve
 *   G  «Kaloje» e hap llogarinë pa profil
 *   H  profilet e sugjeruara dhe ndjekja që mbetet
 *
 * Krijon llogari prove, prandaj pas tij lësho `npm run db:seed`.
 */

import { chromium } from "playwright";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { usernameBaseFromFullName } from "../lib/username.ts";

/** PNG 1x1, sa të provojë rrugën e vërtetë të ngarkimit pa skedar të madh. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const BASE = process.argv[2] ?? "http://localhost:3000";
const PASSWORD = "provoje123";
const db = new PrismaClient();

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`  ${ok ? "OK  " : "DESH"} ${label}${ok || !detail ? "" : `  (${detail})`}`);
  if (!ok) failures += 1;
}

const browser = await chromium.launch();
const errors = [];

/** Kur një hap nuk kalon, teksti i faqes e thotë pse më shpejt se një gjurmë. */
async function expectUrl(page, pattern, label) {
  try {
    await page.waitForURL(pattern, { timeout: 25000 });
    return true;
  } catch {
    const body = (await page.textContent("body")).replace(/\s+/g, " ").slice(0, 300);
    check(label, false, body);
    return false;
  }
}
const created = [];

async function register(label) {
  const email = `provo.${label}.${Date.now().toString(36)}@gmail.com`;
  created.push(email);

  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${label}: ${error.message}`));

  /*
    Regjistrimi i ri (emaili studentor, kodi, ID-ja) provohet te
    `scripts/e2e-registration.mjs`. Këtu llogaria hapet drejt te baza, si një
    llogari e vjetër pa shqyrtim, dhe testi mat vetë hapat e profilit.
  */
  await db.user.create({
    data: {
      email,
      name: `Provë ${label}`,
      username: `${usernameBaseFromFullName(`Prove ${label}`)}${Date.now().toString(36).slice(-4)}`,
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      ageConfirmedAt: new Date(),
      termsAcceptedAt: new Date(),
      emailVerified: new Date(),
    },
  });

  await page.goto(`${BASE}/hyr`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/hyr"), { timeout: 30000 });
  await page.goto(`${BASE}/regjistrohu`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Ku studion?", { timeout: 20000 });

  return { page, email };
}

/** Zgjedh institucionin duke e kërkuar me shkurtesë ose emër. */
async function pickInstitution(page, query, name) {
  await page.fill('input[aria-label="Ku studion?"]', query);
  await page.waitForTimeout(250);
  await page.click(`button:has-text("${name}")`);
  await page.click('button:has-text("Vazhdo")');
  await page.waitForTimeout(600);
}

async function programNames(page) {
  return page.$$eval("[data-program]", (nodes) =>
    nodes.map((node) => node.querySelector("span.font-medium")?.textContent.trim() ?? ""),
  );
}

// A dhe B: kolegj privat, pa fakultet.
{
  const { page, email } = await register("privat");

  await pickInstitution(page, "UBT", "Kolegji UBT");

  const heading = await page.textContent("h1");
  check("A. UBT e pyet drejt për programin", heading.includes("program"), heading);
  check("A. UBT nuk e shfaq hapin e fakultetit", !(await page.isVisible('legend:has-text("Fakulteti")')));

  await page.fill('input[aria-label="Programi i studimit"]', "stomatolog");
  await page.waitForTimeout(600);
  const found = await programNames(page);
  check("B. UBT e gjen Stomatologjinë", found.some((item) => /stomatolog/i.test(item)), found.join(" | "));

  // B: niveli nuk është hap i dytë, vjen bashkë me programin.
  const withLevel = await page.$$eval("[data-program]", (nodes) =>
    nodes.map((node) => node.querySelector("span.text-xs")?.textContent.trim() ?? ""),
  );
  check(
    "B. çdo program e mban shkurtesën e vet",
    withLevel.length > 0 && withLevel.every((item) => /^(BSc|BA|LLB|BMus|MSc|MA|LLM|MMus|MPh|PhD|Dr\.|DMV|Bachelor)/.test(item)),
    withLevel.slice(0, 4).join(" | "),
  );

  await page.click("[data-program] >> nth=0");
  await page.click('button:has-text("Vazhdo")');
  await page.waitForSelector("text=Viti i studimit", { timeout: 10000 });

  const years = await page.$$eval("[data-year]", (nodes) =>
    nodes.map((node) => Number(node.getAttribute("data-year"))),
  );
  check(
    "B. vitet ndjekin kohëzgjatjen e programit",
    years.length >= 4 && years.length <= 6,
    years.join(","),
  );

  await page.click('[data-year="1"]');
  await page.click('button:has-text("Vazhdo")');
  await page.waitForSelector("text=Si të njohin të tjerët?", { timeout: 15000 });

  // F: qyteti kërkohet, jo shkruhet me dorë.
  await page.fill("#ob-city", "gjakov");
  await page.waitForTimeout(250);
  const cities = await page.$$eval('[role="option"]', (nodes) => nodes.map((node) => node.textContent.trim()));
  check("F. kërkimi i qytetit kthen rezultate", cities.length > 0, cities.slice(0, 3).join(" | "));
  if (cities.length > 0) await page.click('[role="option"] >> nth=0');

  // E: fotoja e profilit ngarkohet vërtet dhe ruhet si avatar.
  await page.setInputFiles('input[type="file"]', {
    name: "profili.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await page.waitForTimeout(2500);

  await page.fill("#ob-bio", "Provë e hyrjes.");
  await page.click('button:has-text("Hap llogarinë time")');
  await expectUrl(page, /\/mireseerdhe/, "E. «Hap llogarinë time» e mbyll hyrjen");

  const user = await db.user.findUnique({
    where: { email },
    select: {
      onboardedAt: true,
      avatar: true,
      bio: true,
      city: true,
      university: { select: { slug: true } },
      facultyId: true,
      studyProgram: { select: { name: true } },
    },
  });
  check("A. programi u ruajt te UBT", user?.university?.slug === "ubt", user?.university?.slug);
  check("A. asnjë fakultet nuk u sajua", user?.facultyId === null, String(user?.facultyId));
  check("B. programi i ruajtur është Stomatologji", /stomatolog/i.test(user?.studyProgram?.name ?? ""), user?.studyProgram?.name);
  check("E. llogaria u hap", Boolean(user?.onboardedAt));
  check("E. fotoja u ruajt si avatar", Boolean(user?.avatar), user?.avatar ?? "pa avatar");
  check("E. bio u ruajt", user?.bio === "Provë e hyrjes.", user?.bio ?? "");
  check("F. qyteti u ruajt", Boolean(user?.city), user?.city ?? "");

  // H: ndjekja e një profili të sugjeruar mbetet.
  await page.waitForTimeout(700);
  const followButtons = page.locator('li button:has-text("Ndiqe")');
  if ((await followButtons.count()) > 0) {
    await followButtons.first().click();
    await page.waitForTimeout(1500);
    const follows = await db.follow.count({
      where: { follower: { email } },
    });
    check("H. ndjekja u ruajt", follows > 0, String(follows));
  } else {
    check("H. ekrani i njerëzve u hap", page.url().includes("/mireseerdhe"));
  }

  await page.click('a:has-text("Shko te ballina")');
  await page.waitForURL(/\/feed/, { timeout: 25000 });
  check("H. ballina hapet pas hyrjes", page.url().includes("/feed"));

  await page.context().close();
}

// C dhe D: universitete publike, fakulteti para programit.
for (const [label, query, name, faculty, expect] of [
  ["up", "Prishtinës", "Universiteti i Prishtinës", "Fakulteti i Bujqësisë dhe Veterinarisë", /ekonomi e bujq/i],
  ["gjilan", "Kadri Zeka", "Kadri Zeka", "Fakulteti i Edukimit", /arsimi parashkollor|edukim fillor/i],
]) {
  const { page, email } = await register(label);

  await pickInstitution(page, query, name);

  check(`C. ${label}: hapi i fakultetit shfaqet`, await page.isVisible('legend:has-text("Fakulteti")'));
  check(
    `C. ${label}: programet presin fakultetin`,
    await page.isVisible('[data-note="faculty-first"]'),
  );

  const facultyButton = await page.$(`button:has-text("${faculty}")`);
  check(`C. ${label}: fakulteti «${faculty}» ekziston`, Boolean(facultyButton));
  await facultyButton.click();
  await page.waitForTimeout(900);

  const listed = await programNames(page);
  check(`D. ${label}: programet janë të atij fakulteti`, listed.some((item) => expect.test(item)), listed.slice(0, 4).join(" | "));

  await page.click("[data-program] >> nth=0");
  await page.click('button:has-text("Vazhdo")');
  await page.waitForSelector("text=Viti i studimit", { timeout: 10000 });
  await page.click('[data-year="1"]');
  await page.click('button:has-text("Vazhdo")');
  await page.waitForSelector("text=Si të njohin të tjerët?", { timeout: 15000 });

  // G: «Kaloje» e hap llogarinë pa profil.
  await page.click('button:has-text("Kaloje")');
  await expectUrl(page, /\/mireseerdhe/, `G. ${label}: «Kaloje» e mbyll hyrjen`);

  const user = await db.user.findUnique({
    where: { email },
    select: { onboardedAt: true, facultyId: true, faculty: { select: { name: true } }, studyProgram: { select: { name: true } } },
  });
  check(`C. ${label}: fakulteti u ruajt`, user?.faculty?.name === faculty, user?.faculty?.name);
  check(`G. ${label}: «Kaloje» e hapi llogarinë`, Boolean(user?.onboardedAt));

  await page.context().close();
}

await browser.close();

// Pastrimi: llogaritë e provës nuk mbeten në bazë.
await db.follow.deleteMany({ where: { follower: { email: { in: created } } } });
await db.notification.deleteMany({ where: { actor: { email: { in: created } } } });
await db.user.deleteMany({ where: { email: { in: created } } });
await db.$disconnect();

if (errors.length > 0) {
  console.log("\nGabime te shfletuesi:");
  for (const error of errors) console.log(`  ${error}`);
}

console.log(`\n${failures === 0 ? "Të gjitha kaluan." : `${failures} dështime.`}`);
process.exit(failures === 0 && errors.length === 0 ? 0 : 1);
