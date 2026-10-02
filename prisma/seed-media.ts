import { deflateSync } from "node:zlib";
import { putObject } from "../lib/storage";

/** Foto demonstruese për seed-in. */

/** Një PNG i vërtetë, i ndërtuar nga bajtat. Pa varësi, pa skedarë në depo. */
function makePng(width: number, height: number, paint: (x: number, y: number) => [number, number, number]): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 3 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = paint(x, y);
      const offset = rowStart + 1 + x * 3;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
    }
  }

  const crcTable: number[] = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }

  const crc = (bytes: Buffer) => {
    let c = 0xffffffff;
    for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };

  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, checksum]);
  };

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Çiftet e ngjyrave të referencës «Blu»: blu në cian, vjollcë në rozë, e të tjera pranë tyre. */
const PALETTES: [[number, number, number], [number, number, number]][] = [
  [[29, 95, 224], [0, 180, 216]],
  [[109, 93, 252], [255, 107, 139]],
  [[90, 162, 255], [139, 123, 255]],
  [[2, 64, 137], [90, 162, 255]],
  [[139, 123, 255], [255, 193, 94]],
  [[0, 180, 216], [109, 93, 252]],
];

export type SeededMedia = {
  id: string;
  kind: "image";
  extension: string;
  width: number;
  height: number;
  durationMs: null;
  bytes: number;
  mime: string;
};

export async function buildSeedMedia(): Promise<SeededMedia[]> {
  const out: SeededMedia[] = [];

  for (const [from, to] of PALETTES) {
    const size = 640;
    // Kalim diagonal nga njëra ngjyrë te tjetra, si fotot e referencës.
    const png = makePng(size, size, (x, y) => {
      const t = (x + y) / (size * 2);
      return [0, 1, 2].map((channel) => Math.round(from[channel] + (to[channel] - from[channel]) * t)) as [number, number, number];
    });

    const id = await putObject(png, "png");

    out.push({
      id,
      kind: "image",
      extension: "png",
      width: size,
      height: size,
      durationMs: null,
      bytes: png.length,
      mime: "image/png",
    });
  }

  return out;
}
