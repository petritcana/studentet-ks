/**
 * Bot-ët testues: shëtisin aplikacionin si testues dhe raportojnë problemet.
 *
 * Hyjnë me disa llogari demo (student, Pro, profesor, moderator, admin, kompani),
 * nisin nga ballina dhe ndjekin lidhjet e brendshme që gjejnë, në kompjuter dhe
 * në celular. Vetëm lexojnë: nuk klikojnë butona, nuk postojnë, nuk dalin.
 *
 * Raportojnë vetëm probleme me platformën, jo tekste:
 *   - gabime JavaScript në faqe,
 *   - faqe ose kërkesa që kthejnë 404 ose 5xx,
 *   - foto që nuk hapen,
 *   - faqe që në celular rrëshqasin anash.
 *
 * Çdo problem bëhet raport te `/admin/testimi`, nga «Testuesi automatik», me
 * burimin «bot». I njëjti problem i hapur nuk raportohet dy herë.
 *
 * Lësho: `npm run bot:testers` (serveri në localhost:3000). Opsione:
 *   --max=40   sa faqe për llogari (parazgjedhja 40)
 */

import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BOT_BASE ?? "http://localhost:3000";
const MAX_PAGES = Number(process.argv.find((arg) => arg.startsWith("--max="))?.split("=")[1] ?? 40);
const db = new PrismaClient();

// Rrugët që bot-i nuk i hap: dalja, ndërrimi i llogarisë, skedarët, API-të.
const SKIP = [/^\/api\//, /^\/demo/, /^\/dil/, /^\/logout/, /^\/hyr/, /^\/regjistrohu/, /^\/konfirmo/, /\.(png|jpg|jpeg|webp|svg|pdf|zip)$/i];

// Zhurmë që nuk është problem i platformës (shtesa të shfletuesit, HMR, favicon).
const NOISE = [/favicon/i, /chrome-extension/i, /Download the React DevTools/i];

const ROLES = [
  { label: "student-i-ri", demoLabel: "free-new" },
  { label: "student-i-verifikuar", demoLabel: "free-verified" },
  { label: "pro", demoLabel: "pro-paid" },
  { label: "moderator", demoLabel: "moderator" },
  { label: "admin", demoLabel: "admin" },
  { label: "profesor", role: "professor" },
  { label: "kompani", role: "company" },
];

/** Llogaria që i nënshkruan raportet e bot-ëve. */
async function botUser() {
  const existing = await db.user.findUnique({ where: { username: "testuesi.automatik" }, select: { id: true } });
  if (existing) return existing.id;
  const created = await db.user.create({
    data: {
      email: "testuesi.automatik@bot.studentet.ks",
      username: "testuesi.automatik",
      name: "Testuesi automatik",
      bio: "Bot që shëtit platformën dhe raporton problemet që gjen.",
      onboardedAt: new Date(),
      emailVerified: new Date(),
    },
    select: { id: true },
  });
  return created.id;
}

async function accountsToUse() {
  const found = [];
  for (const role of ROLES) {
    const user = await db.user.findFirst({
      where: role.demoLabel ? { demoLabel: role.demoLabel } : { role: role.role, passwordHash: { not: null } },
      select: { email: true, username: true },
    });
    if (user) found.push({ ...role, email: user.email, username: user.username });
  }
  return found;
}

function sameOrigin(url) {
  try {
    return new URL(url).origin === new URL(BASE).origin;
  } catch {
    return false;
  }
}

function normalizePath(href) {
  try {
    const url = new URL(href, BASE);
    if (url.origin !== new URL(BASE).origin) return null;
    const path = `${url.pathname}${url.search}`;
    if (SKIP.some((pattern) => pattern.test(url.pathname))) return null;
    return path;
  } catch {
    return null;
  }
}

async function visitAll(browser, account, { mobile }) {
  const context = await browser.newContext(
    mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "sq" } : { viewport: { width: 1366, height: 900 }, locale: "sq" },
  );
  const page = await context.newPage();
  const problems = [];
  let current = "/";

  page.on("pageerror", (error) => problems.push({ path: current, kind: "js", detail: error.message }));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (NOISE.some((pattern) => pattern.test(text))) return;
    // Kërkesat që dështojnë i kap `response` më poshtë, me adresën e saktë.
    if (/Failed to load resource/i.test(text)) return;
    problems.push({ path: current, kind: "console", detail: text });
  });
  page.on("response", (response) => {
    const url = response.url();
    if (!sameOrigin(url)) return;
    const status = response.status();
    const pathname = new URL(url).pathname;
    // Qasja e ndaluar është rregull, jo gabim (p.sh. skedar i dikujt tjetër).
    if (status >= 500 || (status === 404 && !pathname.startsWith("/_next/"))) {
      problems.push({ path: current, kind: "http", detail: `${status} ${pathname}` });
    }
  });

  await page.goto(`${BASE}/hyr`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', account.username);
  await page.fill('input[name="password"]', "provoje123");
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/hyr"), { timeout: 30000 }).catch(() => {});

  const queue = ["/feed", "/une", "/materialet", "/karriera", "/komuniteti", "/tregu", "/gara", "/mesazhe", "/cilesimet"];
  const seen = new Set();
  let visited = 0;

  while (queue.length > 0 && visited < MAX_PAGES) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    current = path;
    visited += 1;

    let response;
    try {
      response = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 30000 });
    } catch (error) {
      problems.push({ path, kind: "timeout", detail: String(error.message).split("\n")[0] });
      continue;
    }
    if (response && response.status() >= 400 && response.status() !== 403) {
      problems.push({ path, kind: "page", detail: `${response.status()}` });
    }
    await page.waitForTimeout(400);

    const facts = await page.evaluate(() => {
      const broken = [...document.images]
        .filter((image) => image.complete && image.naturalWidth === 0 && image.getAttribute("src"))
        .map((image) => image.getAttribute("src"))
        .slice(0, 3);
      const overflow = document.documentElement.scrollWidth - window.innerWidth;
      const links = [...document.querySelectorAll("a[href]")].map((anchor) => anchor.getAttribute("href"));
      return { broken, overflow, links };
    });

    for (const src of facts.broken) problems.push({ path, kind: "image", detail: src });
    if (mobile && facts.overflow > 2) problems.push({ path, kind: "overflow", detail: `${facts.overflow}px` });

    for (const href of facts.links) {
      const next = normalizePath(href);
      if (next && !seen.has(next) && !queue.includes(next)) queue.push(next);
    }
  }

  await context.close();
  return { visited, problems };
}

/** Raporti me fjalë të thjeshta, një rresht për problemin. */
function describe(problem, account, mobile) {
  const where = mobile ? "në celular" : "në kompjuter";
  const who = `llogaria ${account.label} (@${account.username}), ${where}`;
  switch (problem.kind) {
    case "js":
      return `Gabim JavaScript te ${problem.path}: ${problem.detail}. U pa nga ${who}.`;
    case "console":
      return `Gabim në konsolë te ${problem.path}: ${problem.detail}. U pa nga ${who}.`;
    case "http":
      return `Një kërkesë dështoi te ${problem.path}: ${problem.detail}. U pa nga ${who}.`;
    case "page":
      return `Faqja ${problem.path} u përgjigj me gabim ${problem.detail}. U pa nga ${who}.`;
    case "timeout":
      return `Faqja ${problem.path} nuk u hap dot brenda 30 sekondave (${problem.detail}). U pa nga ${who}.`;
    case "image":
      return `Një foto nuk hapet te ${problem.path}: ${problem.detail}. U pa nga ${who}.`;
    case "overflow":
      return `Faqja ${problem.path} rrëshqet anash në celular (${problem.detail} më e gjerë se ekrani). U pa nga ${who}.`;
    default:
      return `Problem te ${problem.path}: ${problem.detail}. U pa nga ${who}.`;
  }
}

const reporter = await botUser();
const accounts = await accountsToUse();
const browser = await chromium.launch();
let created = 0;
let found = 0;
let pages = 0;

for (const account of accounts) {
  for (const mobile of [false, true]) {
    // Celulari provohet me dy llogari, që shëtitja të mos zgjasë shumë.
    if (mobile && !["student-i-verifikuar", "admin"].includes(account.label)) continue;
    const { visited, problems } = await visitAll(browser, account, { mobile });
    pages += visited;
    found += problems.length;
    const unique = new Map(problems.map((problem) => [`${problem.kind}|${problem.path}|${problem.detail}`, problem]));

    for (const problem of unique.values()) {
      const signature = `${problem.kind}|${problem.path}|${problem.detail}`.slice(0, 480);
      const open = await db.feedback.findFirst({
        where: { source: "bot", status: { not: "resolved" }, errors: { contains: JSON.stringify(signature).slice(1, -1) } },
        select: { id: true },
      });
      if (open) continue;
      await db.feedback.create({
        data: {
          userId: reporter,
          kind: "bug",
          source: "bot",
          message: describe(problem, account, mobile),
          path: problem.path,
          device: JSON.stringify({
            browser: "Chromium (bot)",
            system: mobile ? "Android (emulim)" : "Desktop",
            screen: mobile ? "390×844" : "1366×900",
            account: account.username,
          }),
          errors: JSON.stringify([signature]),
        },
      });
      created += 1;
    }
    console.log(`${account.label}${mobile ? " (celular)" : ""}: ${visited} faqe, ${unique.size} probleme`);
  }
}

// Një njoftim për adminët, jo një për çdo problem.
if (created > 0) {
  const admins = await db.user.findMany({ where: { role: "admin" }, select: { id: true } });
  const day = new Date().toISOString().slice(0, 10);
  for (const admin of admins) {
    await db.notification.create({
      data: {
        userId: admin.id,
        category: "system",
        type: "feedback_new",
        actorId: reporter,
        targetType: "feedback",
        groupKey: `feedback-bot:${day}`,
        payload: JSON.stringify({ kind: "bug", grouped: created }),
      },
    });
  }
}

await browser.close();
await db.$disconnect();
console.log(`\nGjithsej: ${pages} faqe të vizituara, ${found} vëzhgime, ${created} raporte të reja te /admin/testimi.`);
