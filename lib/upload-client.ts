import { mimeFromName, type MediaRef } from "@/lib/media";

/** Sa e madhe është një copë. E vogël sa të kalojë kudo, e madhe sa të mos bëhen qindra kërkesa. */
const CHUNK_BYTES = 1024 * 1024;
const RETRIES = 3;

export type UploadOutcome =
  | { ok: true; media: MediaRef }
  | { ok: false; errorKey: string };

/**
 * Ngarkimi nga shfletuesi.
 *
 * Skedari ndahet në copa, çdo copë provohet deri tri herë, dhe përparimi kthehet
 * si përqindje që studenti të mos shohë një ekran që nuk lëviz. Ndërprerja e
 * rrjetit nuk e prish ngarkimin: kthehet një gabim i lexueshëm, jo një faqe bosh.
 */
export async function uploadFile(
  file: File,
  options: {
    surface?: "post" | "story" | "voice" | "ai" | "message" | "id";
    durationSeconds?: number | null;
    width?: number | null;
    height?: number | null;
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
  } = {},
): Promise<UploadOutcome> {
  const uploadId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const total = Math.max(1, Math.ceil(file.size / CHUNK_BYTES));

  for (let index = 0; index < total; index += 1) {
    const slice = file.slice(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES);

    const form = new FormData();
    form.set("chunk", slice);
    form.set("uploadId", uploadId);
    form.set("index", String(index));
    form.set("total", String(total));
    if (index + 1 === total) {
      form.set("mime", file.type || mimeFromName(file.name));
      form.set("surface", options.surface ?? "post");
      if (file.name) form.set("name", file.name);
      if (options.durationSeconds != null) form.set("duration", String(options.durationSeconds));
      if (options.width != null) form.set("width", String(options.width));
      if (options.height != null) form.set("height", String(options.height));
    }

    let response: Response | null = null;
    for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
      try {
        response = await fetch("/api/ngarko", { method: "POST", body: form, signal: options.signal });
        break;
      } catch {
        if (options.signal?.aborted) return { ok: false, errorKey: "errors.uploadCancelled" };
        if (attempt === RETRIES) return { ok: false, errorKey: "errors.uploadNetwork" };
        await new Promise((resolve) => setTimeout(resolve, attempt * 700));
      }
    }

    if (!response) return { ok: false, errorKey: "errors.uploadNetwork" };
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, errorKey: body?.error ?? "errors.generic" };
    }

    options.onProgress?.(Math.round(((index + 1) / total) * 100));

    if (index + 1 === total) {
      const body = (await response.json()) as { media?: MediaRef };
      if (!body.media) return { ok: false, errorKey: "errors.generic" };
      return { ok: true, media: body.media };
    }
  }

  return { ok: false, errorKey: "errors.generic" };
}

/** Kohëzgjatja dhe përmasat lexohen para ngarkimit, që kufijtë të thuhen herët. */
export function readMediaMeta(file: File): Promise<{ width: number | null; height: number | null; durationSeconds: number | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const done = (value: { width: number | null; height: number | null; durationSeconds: number | null }) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };

    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () =>
        done({
          width: video.videoWidth || null,
          height: video.videoHeight || null,
          durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
        });
      video.onerror = () => done({ width: null, height: null, durationSeconds: null });
      video.src = url;
      return;
    }

    const image = new Image();
    image.onload = () => done({ width: image.naturalWidth, height: image.naturalHeight, durationSeconds: null });
    image.onerror = () => done({ width: null, height: null, durationSeconds: null });
    image.src = url;
  });
}
