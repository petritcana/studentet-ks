/**
 * Ikonat e PWA-së dhe e favicon-it, nga logoja e vetme te `public/brand/logo.png`.
 *
 * Logoja është rreth blu me kapelën e diplomimit mbi S-në në formë zemre, me
 * qoshe të tejdukshme. Ikonat e zakonshme e marrin ashtu siç është; ato
 * «maskable» dhe e Apple-it e vendosin mbi sfondin e errët blu të temës, brenda
 * zonës së sigurt, sepse sistemi i pret vetë qoshet.
 *
 * Nëse ndryshon logoja, zëvendëso `public/brand/logo.png` dhe lësho `npm run icons`.
 */

import sharp from "sharp";
import { join } from "node:path";

const SOURCE = join(process.cwd(), "public", "brand", "logo.png");
// Sfondi i temës së errët (`--bg` te app/globals.css).
const BACKGROUND = { r: 4, g: 11, b: 28, alpha: 1 };

async function plain(size, file) {
  await sharp(SOURCE).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
}

async function padded(size, file, ratio) {
  const inner = Math.round(size * ratio);
  const logo = await sharp(SOURCE).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BACKGROUND } })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(file);
}

const pub = (name) => join(process.cwd(), "public", name);
await plain(192, pub("icon-192.png"));
await plain(512, pub("icon-512.png"));
await padded(512, pub("icon-maskable.png"), 0.72);
await padded(180, pub("apple-icon.png"), 0.84);
// Favicon-i: `app/icon.png` e shërben Next vetë.
await plain(64, join(process.cwd(), "app", "icon.png"));

console.log("Ikonat u gjeneruan nga public/brand/logo.png.");
