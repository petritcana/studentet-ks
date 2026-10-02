/**
 * Ndërrimi i password-it brenda platformës.
 *
 * Nga profili («⋯» → «Ndrysho password-in») te cilësimet: i vjetri i gabuar
 * refuzohet, i riu duhet të plotësojë rregullat dhe të përputhet, dhe pas
 * ndryshimit hyrja punon vetëm me të riun. Në fund password-i kthehet si ishte.
 */

import { chromium } from "playwright";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const BASE = process.argv[2] ?? "http://localhost:3000";
const USER = "erza.krasniqi";
const OLD = "provoje123";
const NEW = "Studenti!2026";
const db = new PrismaClient();

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`  ${ok ? "OK  " : "DESH"} ${label}${ok || !detail ? "" : `  (${detail})`}`);
  if (!ok) failures += 1;
}

const browser = await chromium.launch();
const errors = [];

async function login(password) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "sq" });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${BASE}/hyr`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', USER);
  await page.fill('input[name="password"]', password);
  await page.click("[data-login-submit]");
  const ok = await page
    .waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  return { context, page, ok };
}

try {
  const { context, page } = await login(OLD);
  await page.goto(`${BASE}/u/${USER}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Më shumë|More/ }).first().click();
  await page.locator("[data-profile-password]").click();
  await page.waitForURL(/\/cilesimet/, { timeout: 15000 });
  await page.locator("[data-password-change]").waitFor({ timeout: 15000 }).catch(() => {});
  check("nga profili te «Ndrysho password-in»", (await page.locator("[data-password-change]").count()) === 1 && page.url().endsWith("#password"));

  const submit = page.locator("[data-password-submit]");
  await page.fill("#password-current", "gabim-gabim");
  await page.fill("#password-new", "studenti");
  await page.fill("#password-confirm", "studenti");
  check("password-i i dobët nuk dërgohet", await submit.isDisabled());

  await page.fill("#password-new", NEW);
  await page.fill("#password-confirm", `${NEW}x`);
  check("pa përputhje nuk dërgohet", await submit.isDisabled());

  await page.fill("#password-confirm", NEW);
  await submit.click();
  await page.locator("[data-password-error]").waitFor({ timeout: 10000 }).catch(() => {});
  check("i vjetri i gabuar refuzohet", (await page.getByText("Password-i i tanishëm nuk është i saktë.").count()) === 1);

  await page.fill("#password-current", OLD);
  await submit.click();
  await page.getByText("Password-i u ndryshua.").first().waitFor({ timeout: 10000 }).catch(() => {});
  check("ndryshimi u ruajt", (await page.getByText("Password-i u ndryshua.").count()) >= 1);
  check("fushat pastrohen", (await page.inputValue("#password-current")) === "" && (await page.inputValue("#password-new")) === "");
  await context.close();

  const withOld = await login(OLD);
  check("i vjetri nuk hyn më", !withOld.ok);
  await withOld.context.close();
  const withNew = await login(NEW);
  check("i riu hyn", withNew.ok);
  await withNew.context.close();

  check("asnjë gabim JavaScript", errors.length === 0, errors.join(" | "));
} finally {
  await db.user.update({ where: { username: USER }, data: { passwordHash: await bcrypt.hash(OLD, 10) } });
  await browser.close();
  await db.$disconnect();
}

console.log(failures === 0 ? "\nGjithçka kaloi." : `\n${failures} prova dështuan.`);
process.exit(failures === 0 ? 0 : 1);
