/**
 * Vendos çelësat e Google-it te `.env`, pa e hapur skedarin me dorë.
 *
 * Lësho: `npm run google:key -- <CLIENT_ID> <CLIENT_SECRET>`
 * Kur ID-ja është tashmë te `.env`: `npm run google:key -- <CLIENT_SECRET>`
 *
 * Çelësat merren te Google Cloud Console → APIs & Services → Credentials →
 * Create credentials → OAuth client ID → Web application. Aty regjistrohen
 * adresat që shtyp ky skript. Pas vendosjes, serveri duhet rinisur.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const args = process.argv.slice(2).map((value) => value.trim()).filter(Boolean);
const file = ".env";
let env = existsSync(file) ? readFileSync(file, "utf8") : "";

// Vetëm sekreti: ID-ja merret nga `.env`, nëse është vendosur më parë.
const saved = /^AUTH_GOOGLE_ID="?([^"\n]*)"?$/m.exec(env)?.[1] ?? "";
const [id, secret] = args.length === 1 && !args[0].endsWith(".apps.googleusercontent.com") ? [saved, args[0]] : args;

function guide() {
  console.log("Përdorimi: npm run google:key -- <CLIENT_ID> <CLIENT_SECRET>");
  console.log("");
  console.log("Te Google Cloud Console, te «Authorized JavaScript origins» vendos:");
  console.log("  http://localhost:3000");
  console.log("Te «Authorized redirect URIs» vendos:");
  console.log("  http://localhost:3000/api/auth/callback/google");
  console.log("Për Netlify shto edhe të njëjtat me adresën e faqes, p.sh.:");
  console.log("  https://<faqja>.netlify.app/api/auth/callback/google");
}

if (!id || !secret) {
  guide();
  process.exit(1);
}

if (!id.endsWith(".apps.googleusercontent.com")) {
  console.log("Client ID duhet të mbarojë me «.apps.googleusercontent.com». Kontrollo që e kopjove të tërin.");
  process.exit(1);
}
if (secret.length < 20) {
  console.log("Client secret duket i shkurtër. Te Google zakonisht nis me «GOCSPX-».");
  process.exit(1);
}

function put(name, value) {
  const line = `${name}="${value}"`;
  const pattern = new RegExp(`^${name}=.*$`, "m");
  env = pattern.test(env) ? env.replace(pattern, line) : `${env.trimEnd()}\n${line}\n`;
}

put("AUTH_GOOGLE_ID", id);
put("AUTH_GOOGLE_SECRET", secret);
writeFileSync(file, env);

console.log("Çelësat e Google-it u vendosën te .env.");
console.log("Rinise serverin (npm run build, pastaj npx next start -p 3000), dhe «Vazhdo me Google» del i vërtetë.");
console.log("");
guide();
