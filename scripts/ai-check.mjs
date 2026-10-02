/**
 * A punon vërtet asistenti.
 *
 * Provon ofruesin e konfiguruar me një pyetje studimi, dhe modelin e imazheve me
 * një foto të vogël. Pa çelës e thotë hapur çfarë mungon, në vend që të japë një
 * gabim të thatë.
 *
 * Lësho: `npm run ai:check`
 */
import { readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

/*
  Leximi i `.env` bëhet këtu, pa varësi të re.

  Ky skript lëshohet jashtë Next-it, i cili i ngarkon vetë ato variabla, dhe një
  paketë e tërë vetëm për tri rreshta do të ishte tepër.
*/
try {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const value = match[2].replace(/^["']|["']$/g, "");
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
} catch {
  // Pa `.env` punohet me variablat e mjedisit, si te prodhimi.
}

const chosen = (process.env.AI_PROVIDER ?? "").toLowerCase().trim();
const baseUrl = (process.env.AI_BASE_URL ?? "").replace(/\/+$/, "");
const model = process.env.AI_MODEL;
const key = process.env.AI_API_KEY;
const groq = baseUrl.includes("groq.com");
const vision = process.env.AI_VISION_MODEL ?? (groq ? "qwen/qwen3.8-27b" : model);

if (chosen === "mock") {
  console.log('AI_PROVIDER="mock": asistenti punon me ofruesin demonstrues, me qëllim.');
  process.exit(1);
}

if (!baseUrl || !model) {
  console.log("Asistenti punon me ofruesin demonstrues: asnjë çelës nuk është vendosur.");
  console.log("Merr një çelës falas te https://console.groq.com/keys dhe lësho npm run ai:key -- <çelësi>");
  process.exit(1);
}

async function ask(name, content) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify({ model: name, messages: [{ role: "user", content }], max_tokens: 600 }),
  });
  if (!response.ok) {
    console.log(`Dështoi: ${response.status}`);
    console.log((await response.text()).slice(0, 300));
    return false;
  }
  const data = await response.json();
  const text = (data?.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  console.log("Përgjigja:", text.slice(0, 200).replace(/\s+/g, " "));
  return Boolean(text);
}

console.log(`Teksti: ${model} te ${baseUrl}`);
const textOk = await ask(model, "Shpjegoje shkurt ç'është derivati i një funksioni.");

// Një PNG 64x64 i kuq, i ndërtuar këtu: Groq nuk pranon imazhe nën 32 piksela.
function redSquare(size = 64) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (bytes) => {
    let c = 0xffffffff;
    for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, "latin1");
    const tail = Buffer.alloc(4);
    tail.writeUInt32BE(crc(Buffer.concat([Buffer.from(type, "latin1"), data])), 0);
    return Buffer.concat([head, data, tail]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: size }, () => [220, 30, 30]).flat())]);
  const pixels = deflateSync(Buffer.concat(Array.from({ length: size }, () => row)));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", pixels),
    chunk("IEND", Buffer.alloc(0)),
  ]).toString("base64");
}
const pixel = redSquare();
console.log(`\nImazhet: ${vision}`);
const visionOk = await ask(vision, [
  { type: "text", text: "What colour is this image? One word." },
  { type: "image_url", image_url: { url: `data:image/png;base64,${pixel}` } },
]);

process.exit(textOk && visionOk ? 0 : 1);
