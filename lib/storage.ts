import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.env.STORAGE_DIR ?? join(process.cwd(), ".data", "uploads");

/**
 * Ku jetojnë bajtat.
 *
 * Në Netlify dhe në Vercel sistemi i skedarëve fshihet mes kërkesave, prandaj
 * atje përdoren Netlify Blobs ose Vercel Blob, të dyja private. Lokalisht mbetet
 * disku. `STORAGE_DRIVER` e detyron njërin.
 */
const DRIVER =
  process.env.STORAGE_DRIVER ??
  (process.env.NETLIFY ? "netlify-blobs" : process.env.VERCEL ? "vercel-blob" : "disk");

/** Katër veprime, të njëjta për çdo vend ruajtjeje. */
type Backend = {
  set(key: string, bytes: Buffer): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  exists(key: string): Promise<boolean>;
  remove(key: string): Promise<void>;
};

const disk: Backend = {
  async set(key, bytes) {
    const path = join(ROOT, key);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, bytes);
  },
  async get(key) {
    return readFile(join(ROOT, key));
  },
  async exists(key) {
    await stat(join(ROOT, key));
    return true;
  },
  async remove(key) {
    await rm(join(ROOT, key), { force: true });
  },
};

async function netlifyStore() {
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: "uploads", consistency: "strong" });
}

const netlifyBlobs: Backend = {
  async set(key, bytes) {
    const view = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    await (await netlifyStore()).set(key, view as ArrayBuffer);
  },
  async get(key) {
    const data = await (await netlifyStore()).get(key, { type: "arrayBuffer" });
    return data ? Buffer.from(data) : null;
  },
  async exists(key) {
    return (await (await netlifyStore()).getMetadata(key)) !== null;
  },
  async remove(key) {
    await (await netlifyStore()).delete(key);
  },
};

/*
  Vercel Blob, me qasje private: skedari nuk ka adresë publike, lexohet vetëm me
  tokenin e serverit (`BLOB_READ_WRITE_TOKEN`), dhe studenti e merr vetëm përmes
  `/api/media/[id]`, që kontrollon lejet. Pa rastësi në emër, që çelësi të mbetet
  ai i përmbajtjes.
*/
const vercelBlob: Backend = {
  async set(key, bytes) {
    const { put } = await import("@vercel/blob");
    await put(key, bytes, { access: "private", addRandomSuffix: false, allowOverwrite: true });
  },
  async get(key) {
    const { get } = await import("@vercel/blob");
    const result = await get(key, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return null;
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  },
  async exists(key) {
    const { head } = await import("@vercel/blob");
    await head(key);
    return true;
  },
  async remove(key) {
    const { del } = await import("@vercel/blob");
    await del(key);
  },
};

const backend: Backend = DRIVER === "netlify-blobs" ? netlifyBlobs : DRIVER === "vercel-blob" ? vercelBlob : disk;

/** Adresimi sipas përmbajtjes: i njëjti skedar i ngarkuar dy herë zë një vend. */
export function contentId(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 40);
}

/** E shkruan skedarin dhe kthen id-në e tij. */
export async function putObject(bytes: Buffer, extension: string): Promise<string> {
  const id = contentId(bytes);
  await backend.set(objectKey(id, extension), bytes);
  return id;
}

export async function getObject(id: string, extension: string): Promise<Buffer | null> {
  try {
    return await backend.get(objectKey(id, extension));
  } catch {
    return null;
  }
}

export async function objectExists(id: string, extension: string): Promise<boolean> {
  try {
    return await backend.exists(objectKey(id, extension));
  } catch {
    return false;
  }
}

/**
 * Çelësi i skedarit. Shtegu ndahet në dy nivele nga dy shkronjat e para, që një
 * dosje e vetme të mos mbledhë dhjetëra mijëra skedarë.
 */
export function objectKey(id: string, extension: string) {
  // Id-ja vjen nga hash-i ynë, prandaj nuk mban kurrë shtigje. Filtri mbetet si
  // rrjetë sigurie, sepse një thirrës i ardhshëm mund të mos e dijë këtë.
  const safe = id.replace(/[^a-f0-9]/g, "");
  const clean = extension.replace(/[^a-z0-9]/g, "");
  return `${safe.slice(0, 2)}/${safe}.${clean}`;
}

/**
 * Copat e një ngarkimi në vazhdim.
 *
 * Një skedar i madh nuk kalon dot si trup i vetëm: hostet e presin kërkesën mbi
 * disa megabajt, dhe server actions kanë kufirin e vet. Prandaj skedari vjen me
 * copa, ruhet përkohësisht këtu dhe bashkohet vetëm në fund. Në Vercel çdo copë
 * mund të bjerë në një funksion tjetër, prandaj edhe copat rrinë te Blob-i.
 */
export async function putChunk(uploadId: string, index: number, bytes: Buffer): Promise<void> {
  await backend.set(chunkKey(uploadId, index), bytes);
}

export async function joinChunks(uploadId: string, total: number): Promise<Buffer | null> {
  const parts: Buffer[] = [];
  for (let index = 0; index < total; index += 1) {
    try {
      const data = await backend.get(chunkKey(uploadId, index));
      if (!data) return null;
      parts.push(data);
    } catch {
      return null;
    }
  }
  return Buffer.concat(parts);
}

export async function removeChunks(uploadId: string, total: number): Promise<void> {
  for (let index = 0; index < total; index += 1) {
    try {
      await backend.remove(chunkKey(uploadId, index));
    } catch {
      // Copa e mbetur nuk e prish ngarkimin; pastrohet nga fshirja e radhës.
    }
  }
}

function chunkKey(uploadId: string, index: number) {
  const safe = uploadId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 40);
  return `tmp/${safe}/${String(index).padStart(4, "0")}.part`;
}
