/**
 * Gjeneron ikonat e PWA-së pa varësi të jashtme.
 *
 * Vizatimi bëhet drejtpërdrejt në një buffer RGBA dhe kodohet si PNG me zlib-in
 * e Node-it. Kështu ikonat rrjedhin nga të njëjtat tokena si marka dhe nuk kemi
 * nevojë për një bibliotekë grafike vetëm për katër skedarë.
 */

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BRAND = [79, 70, 229];
const WHITE = [255, 255, 255];

function crc32(buffer) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = (crc >>> 8) ^ table[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(width, height, pixels) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Distanca e nënshkruar deri te një drejtkëndësh me kënde të rrumbullakosura. */
function insideRoundedRect(x, y, left, top, right, bottom, radius) {
  const cx = Math.max(left + radius, Math.min(x, right - radius));
  const cy = Math.max(top + radius, Math.min(y, bottom - radius));
  const dx = x - cx;
  const dy = y - cy;
  if (x >= left + radius && x <= right - radius) return y >= top && y <= bottom;
  if (y >= top + radius && y <= bottom - radius) return x >= left && x <= right;
  return dx * dx + dy * dy <= radius * radius;
}

function drawIcon(size, { maskable = false } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  const pad = maskable ? size * 0.1 : 0;
  const radius = maskable ? size / 2 : size * 0.22;

  const set = (x, y, [r, g, b], alpha = 255) => {
    const index = (y * size + x) * 4;
    const existingAlpha = pixels[index + 3] / 255;
    const a = alpha / 255;
    pixels[index] = Math.round(r * a + pixels[index] * existingAlpha * (1 - a));
    pixels[index + 1] = Math.round(g * a + pixels[index + 1] * existingAlpha * (1 - a));
    pixels[index + 2] = Math.round(b * a + pixels[index + 2] * existingAlpha * (1 - a));
    pixels[index + 3] = Math.round(255 * (a + existingAlpha * (1 - a)));
  };

  // Sfondi i markës.
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (insideRoundedRect(x, y, pad, pad, size - pad, size - pad, radius)) {
        set(x, y, BRAND);
      }
    }
  }

  // Dy faqet e librit të hapur, si te shenja e markës.
  const inner = size * (maskable ? 0.24 : 0.28);
  const top = size * (maskable ? 0.32 : 0.3);
  const bottom = size * (maskable ? 0.68 : 0.7);
  const middle = size / 2;
  const gap = size * 0.03;

  for (let y = Math.floor(top); y < Math.ceil(bottom); y += 1) {
    const progress = (y - top) / (bottom - top);
    const lift = Math.sin(progress * Math.PI) * size * 0.05;

    for (let x = Math.floor(inner); x < Math.ceil(size - inner); x += 1) {
      const isLeft = x < middle - gap / 2;
      const isRight = x > middle + gap / 2;
      if (!isLeft && !isRight) continue;

      const edgeTop = top + lift * (isLeft ? 1 : 0.6);
      const edgeBottom = bottom - lift * (isLeft ? 0.6 : 1);
      if (y < edgeTop || y > edgeBottom) continue;

      set(x, y, WHITE, isLeft ? 245 : 185);
    }
  }

  return encodePng(size, size, pixels);
}

const out = join(process.cwd(), "public");
mkdirSync(out, { recursive: true });

writeFileSync(join(out, "icon-192.png"), drawIcon(192));
writeFileSync(join(out, "icon-512.png"), drawIcon(512));
writeFileSync(join(out, "icon-maskable-512.png"), drawIcon(512, { maskable: true }));
writeFileSync(join(out, "apple-icon.png"), drawIcon(180));

console.log("Ikonat u gjeneruan në public/");
