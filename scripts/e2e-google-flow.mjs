/**
 * Rrjedha pas Google-it, pa Google-in e vërtetë.
 *
 * Krijon një llogari si ajo që krijon adapteri pas hyrjes së parë me Google
 * (email i konfirmuar, pa password, llogari Google e lidhur) dhe e fut me hyrjen
 * demo të NextAuth. Pastaj kontrollon: `/regjistrohu` e çon te «Krijo llogarinë
 * tënde», password-i ruhet, «Vazhdo» hap Institucionin e onboarding-ut, hyrja me
 * username dhe password-in e ri punon, dhe gabimi i Google-it del te `/hyr`.
 * Kërkon `DEMO_MODE=true`. E fshin llogarinë në fund.
 */

import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const db = new PrismaClient();

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`  ${ok ? "OK  " : "DESH"} ${label}${ok || !detail ? "" : `  (${detail})`}`);
  if (!ok) failures += 1;
}

const stamp = Date.now().toString(36);
const email = `prove.google.${stamp}@student.uni-pr.edu`;
const user = await db.user.create({
  data: {
    email,
    name: "Provë Google",
    username: `prove.google.${stamp}`,
    firstName: "Provë",
    lastName: "Google",
    emailVerified: new Date(),
    // Si te `lib/auth-adapter.ts`: Google e provoi adresën studentore, por
    // llogaria vetëm shikon derisa admini ta miratojë ID-në.
    studentEmail: email,
    awaitingReview: true,
    termsAcceptedAt: new Date(),
    demoLabel: "google-test",
    accounts: { create: { type: "oidc", provider: "google", providerAccountId: `google-${stamp}` } },
  },
});

const browser = await chromium.launch();
const errors = [];
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));

try {
  console.log("Para password-it:");
  await page.goto(`${BASE}/hyr`, { waitUntil: "networkidle" });
  check("fusha tregon «emri.mbiemri», jo një emër të vërtetë", (await page.locator('input[name="email"]').getAttribute("placeholder")).startsWith("emri.mbiemri"));
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "Cfaredo!123");
  await page.locator("[data-login-submit]").click();
  await page.locator("[data-auth-alert]").waitFor({ timeout: 15000 });
  check("llogari vetëm me Google: të çon te «Vazhdo me Google»", (await page.getByText("Kjo llogari u hap me Google.").count()) === 1);

  // «Kthimi nga Google»: sesioni hapet me hyrjen demo, pa password.
  const csrf = await (await context.request.get(`${BASE}/api/auth/csrf`)).json();
  await context.request.post(`${BASE}/api/auth/callback/demo`, {
    form: { csrfToken: csrf.csrfToken, userId: user.id, callbackUrl: `${BASE}/regjistrohu` },
  });

  console.log("Pas Google-it:");
  await page.goto(`${BASE}/regjistrohu`, { waitUntil: "networkidle" });
  check("pa password, onboarding-u pret: del «Krijo llogarinë tënde»", page.url().includes("/regjistrohu/llogaria"), page.url());
  check("emaili i vërtetë te karta", (await page.locator("[data-verified-card]").innerText()).includes(email));
  check("«Email studentor» për adresën institucionale", (await page.getByText("Email studentor", { exact: true }).count()) === 1);
  check("username-i i llogarisë, jo sugjerim", (await page.locator("#setup-username").inputValue()) === user.username);

  await page.locator("#setup-password").fill("Studenti!2026");
  await page.locator("#setup-confirm").fill("Studenti!2026");
  check("pa datën e lindjes «Vazhdo» rri i mbyllur", await page.locator("[data-setup-continue]").isDisabled());
  await page.locator("#setup-birth").fill("2003-04-10");
  await page.locator("[data-setup-continue]").click();
  // Emaili studentor erdhi nga Google: pa kod, drejt te fotoja e ID-së.
  const idStep = await page.waitForSelector('[data-auth-screen="id"]', { timeout: 20000 }).then(() => true).catch(() => false);
  check("«Vazhdo» hap foton e ID-së, pa kod", idStep, page.url());

  const saved = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true, birthDate: true } });
  check("password-i u ruajt i enkriptuar", Boolean(saved.passwordHash) && (await bcrypt.compare("Studenti!2026", saved.passwordHash)));
  check("data e lindjes u ruajt", saved.birthDate?.toISOString().startsWith("2003-04-10") === true);

  await page.goto(`${BASE}/regjistrohu/llogaria`, { waitUntil: "networkidle" });
  check("password-i vendoset vetëm një herë", !page.url().includes("/llogaria"), page.url());

  console.log("\nHyrja me password-in e ri:");
  await context.clearCookies();
  await page.goto(`${BASE}/hyr`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', user.username);
  await page.fill('input[name="password"]', "Studenti!2026");
  await page.locator("[data-login-submit]").click();
  const entered = await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 30000 }).then(() => true).catch(() => false);
  check("hyn me username dhe password-in e Studentët.KS", entered, page.url());

  await context.clearCookies();
  await page.goto(`${BASE}/hyr`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email.toUpperCase());
  await page.fill('input[name="password"]', "Studenti!2026");
  await page.locator("[data-login-submit]").click();
  const byEmail = await page.waitForURL((url) => !url.pathname.includes("/hyr"), { timeout: 30000 }).then(() => true).catch(() => false);
  check("hyn edhe me emailin (pa dallim shkronjash) dhe password-in", byEmail, page.url());

  console.log("\nGabimet e Google-it:");
  await context.clearCookies();
  await page.goto(`${BASE}/hyr?error=AccessDenied`, { waitUntil: "networkidle" });
  check("email i pakonfirmuar: alarmi i Google-it", (await page.getByText("Google nuk e konfirmoi këtë email.").count()) === 1);
  await page.goto(`${BASE}/hyr?error=Configuration`, { waitUntil: "networkidle" });
  check("lidhja dështoi: alarmi i qartë", (await page.getByText("Hyrja me Google nuk u krye.").count()) === 1);

  check(`pa gabime JavaScript (${errors.length})`, errors.length === 0);
  if (errors.length) console.log(errors.join("\n"));
} finally {
  await db.user.delete({ where: { id: user.id } }).catch(() => undefined);
  await browser.close();
  await db.$disconnect();
}

console.log(failures === 0 ? "\nTë gjitha kontrollet kaluan." : `\n${failures} kontrolle dështuan.`);
process.exit(failures === 0 ? 0 : 1);
