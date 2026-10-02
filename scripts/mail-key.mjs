/**
 * Lidh dërgimin e emailit te `.env`, pa e hapur skedarin me dorë.
 *
 * Gmail, sot, pa domen:
 *   npm run mail:key -- gmail <adresa@gmail.com> <app-password>
 *
 * Resend, kur të ketë domen të verifikuar:
 *   npm run mail:key -- resend <re_çelësi> <njoftime@domeni.com>
 *
 * Fjalëkalimi i Gmail-it është «app password» (16 shkronja), i krijuar te
 * https://myaccount.google.com/apppasswords pasi ndizet verifikimi me dy hapa.
 * Fjalëkalimi i zakonshëm i Gmail-it nuk pranohet. Sekretet nuk shtypen kurrë.
 *
 * Pasi lidhet emaili, kodi nuk del më te faqja: shkon vërtet te studenti.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const [kind, first, second] = process.argv.slice(2).map((value) => value?.trim());

function usage() {
  console.log("Përdorimi:");
  console.log("  npm run mail:key -- gmail <adresa@gmail.com> <app-password>");
  console.log("  npm run mail:key -- resend <re_çelësi> <njoftime@domeni.com>");
  console.log("");
  console.log("App password për Gmail: https://myaccount.google.com/apppasswords");
  process.exit(1);
}

const path = ".env";
let env = existsSync(path) ? readFileSync(path, "utf8") : "";

function set(variable, value) {
  const line = `${variable}="${value}"`;
  const pattern = new RegExp(`^#?\\s*${variable}=.*$`, "m");
  env = pattern.test(env) ? env.replace(pattern, line) : `${env.replace(/\n*$/, "\n")}${line}\n`;
}

if (kind === "gmail") {
  if (!first?.includes("@") || !second) usage();
  const password = second.replace(/\s+/g, "");
  if (password.length !== 16) {
    console.log("App password i Gmail-it ka 16 shkronja. Krijoje te https://myaccount.google.com/apppasswords");
    process.exit(1);
  }
  set("MAIL_PROVIDER", "smtp");
  set("MAIL_HOST", "smtp.gmail.com");
  set("MAIL_PORT", "465");
  set("MAIL_USER", first);
  set("MAIL_PASSWORD", password);
  set("MAIL_FROM", `Studentët.KS <${first}>`);
  writeFileSync(path, env, "utf8");
  console.log(`Gmail u lidh: kodet dërgohen nga ${first}. Rinis serverin që ta lexojë.`);
} else if (kind === "resend") {
  if (!first?.startsWith("re_") || !second?.includes("@")) usage();
  set("MAIL_PROVIDER", "resend");
  set("RESEND_API_KEY", first);
  set("MAIL_FROM", `Studentët.KS <${second}>`);
  writeFileSync(path, env, "utf8");
  console.log(`Resend u lidh: kodet dërgohen nga ${second}. Rinis serverin që ta lexojë.`);
} else {
  usage();
}
