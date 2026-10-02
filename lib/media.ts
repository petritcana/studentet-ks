/** Sa foto mund të mbajë një postim. Mbi katër, rrjeti tregon numrin e mbetur. */
export const MAX_POST_IMAGES = 10;

/** Fotoja e plotë nga telefoni. Shfletuesi e zvogëlon para dërgimit (`lib/shrink-image.ts`). */
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

export const MAX_VIDEO_SECONDS = 30;
export const MAX_STORY_VIDEO_SECONDS = 15;

/**
 * Mesazhi i zërit: dy minuta, pesë megabajt.
 *
 * Shfletuesi e regjistron zërin brenda të njëjtave kontejnerë si videon (WebM te
 * Chrome dhe Firefox, MP4 te Safari), prandaj ruhet me llojin e kontejnerit dhe
 * `Message.kind = "voice"` thotë se duhet luajtur si zë.
 */
export const MAX_VOICE_SECONDS = 120;
export const MAX_VOICE_BYTES = 5 * 1024 * 1024;

export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  // iPhone e kthen vetë HEIC-un në JPEG kur zgjidhet nga galeria, por skedari i
  // rëndë i ardhur nga AirDrop mbetet HEIC. Pranohet dhe ruhet ashtu siç vjen.
  "image/heic": "heic",
  "image/heif": "heic",
};

export const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

/** Skedarët e bisedës: PDF, Word, Excel, PowerPoint, ZIP dhe tekst. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export const DOCUMENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/msword": "doc",
  "application/vnd.ms-excel": "xls",
  "application/vnd.ms-powerpoint": "ppt",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "text/plain": "txt",
};

/** Për zgjedhjen e skedarit: shfletuesi nuk e njeh gjithmonë llojin, prapashtesa ndihmon. */
export const DOCUMENT_ACCEPT = [
  ...Object.keys(DOCUMENT_TYPES),
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".zip", ".txt",
].join(",");

export type MediaKind = "image" | "video" | "file";

export type MediaRef = {
  id: string;
  kind: MediaKind;
  extension: string;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  /** Vetëm te skedarët: emri që pa studenti dhe madhësia, për kartën në bisedë. */
  name?: string;
  bytes?: number;
};

/** Emri i skedarit pa shtigje dhe shenja kontrolli, i shkurtuar. */
export function cleanFileName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "";
  const clean = base.replace(/[\u0000-\u001f\u007f"<>|:*?]/g, "").trim();
  return (clean || "skedar").slice(0, 120);
}

/** Madhësia e lexueshme: 820 KB, 3.4 MB. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export type MediaCheck =
  | { ok: true; kind: MediaKind; extension: string }
  | { ok: false; reason: "type" | "size" | "duration" };

export function checkMedia(
  file: { type: string; size: number },
  durationSeconds: number | null,
  limits: { videoSeconds?: number; voice?: boolean; files?: boolean } = {},
): MediaCheck {
  if (limits.voice) {
    const voiceExt = VIDEO_TYPES[file.type];
    if (!voiceExt) return { ok: false, reason: "type" };
    if (file.size > MAX_VOICE_BYTES) return { ok: false, reason: "size" };
    if (durationSeconds !== null && durationSeconds > MAX_VOICE_SECONDS + 0.5) {
      return { ok: false, reason: "duration" };
    }
    return { ok: true, kind: "video", extension: voiceExt };
  }

  const imageExt = IMAGE_TYPES[file.type];
  if (imageExt) {
    if (file.size > MAX_IMAGE_BYTES) return { ok: false, reason: "size" };
    return { ok: true, kind: "image", extension: imageExt };
  }

  const videoExt = VIDEO_TYPES[file.type];
  if (videoExt) {
    if (file.size > MAX_VIDEO_BYTES) return { ok: false, reason: "size" };

    const allowed = limits.videoSeconds ?? MAX_VIDEO_SECONDS;
    // Kohëzgjatja e panjohur nuk refuzohet: disa shfletues nuk e japin dot para
    // ngarkimit, dhe refuzimi do të bllokonte një video krejt të rregullt.
    if (durationSeconds !== null && durationSeconds > allowed + 0.5) {
      return { ok: false, reason: "duration" };
    }

    return { ok: true, kind: "video", extension: videoExt };
  }

  // Skedarët pranohen vetëm te biseda, ku shkarkohen, kurrë nuk hapen brenda faqes.
  const documentExt = limits.files ? DOCUMENT_TYPES[file.type] : undefined;
  if (documentExt) {
    if (file.size > MAX_FILE_BYTES) return { ok: false, reason: "size" };
    return { ok: true, kind: "file", extension: documentExt };
  }

  return { ok: false, reason: "type" };
}

/**
 * Lloji i një dokumenti nga bajtat, me llojin e deklaruar vetëm si ndihmë.
 *
 * PDF-i ka shenjën e vet. Word, Excel dhe PowerPoint i ri janë ZIP nga brenda,
 * dhe të vjetrit janë OLE: aty lloji i deklaruar zgjedh mes tyre, por vetëm kur
 * bajtat përputhen. Teksti pranohet kur nuk ka bajta zero. Çdo gjë tjetër refuzohet.
 */
export function documentMime(bytes: Buffer, declared: string): string | null {
  const head = bytes.subarray(0, 8);
  if (head.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";

  const zipFamily = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];
  if (head.toString("hex").startsWith("504b0304")) {
    return zipFamily.includes(declared) ? declared : "application/zip";
  }

  const oleFamily = ["application/msword", "application/vnd.ms-excel", "application/vnd.ms-powerpoint"];
  if (head.toString("hex") === "d0cf11e0a1b11ae1") {
    return oleFamily.includes(declared) ? declared : null;
  }

  if (declared === "text/plain" && !bytes.subarray(0, 8192).includes(0)) return "text/plain";
  return null;
}

/**
 * Si shpërndahen fotot në rrjet.
 *
 * Një foto merr tërë gjerësinë, dy ndahen përgjysmë, tri bëhen një e madhe plus
 * dy të vogla, katër bëhen dy me dy. Mbi katër shfaqen katër dhe numri i mbetur,
 * sepse një rrjet me nëntë kuadrate të vegjël nuk lexohet.
 */
export function gridPlan(count: number): { shown: number; remaining: number } {
  if (count <= 4) return { shown: count, remaining: 0 };
  return { shown: 4, remaining: count - 4 };
}

/** Kohëzgjatja si mm:ss, për etiketën mbi videon. */
export function formatDuration(milliseconds: number): string {
  const total = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Media e ruajtur si tekst te `Post.media`. SQLite nuk ka tipin Json. */
export function parseMedia(raw: string): MediaRef[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is MediaRef =>
        Boolean(item) &&
        typeof item.id === "string" &&
        (item.kind === "image" || item.kind === "video" || item.kind === "file") &&
        typeof item.extension === "string",
    );
  } catch {
    return [];
  }
}

export function serializeMedia(refs: MediaRef[]): string {
  return JSON.stringify(refs.slice(0, MAX_POST_IMAGES));
}

/**
 * Lloji i vërtetë i skedarit, nga bajtat e parë.
 *
 * Klienti mund të thotë çfarë të dojë: një `.png` mund të jetë HTML, dhe HTML i
 * shërbyer nga i njëjti origjin është vrimë sigurie. Prandaj lloji nuk merret
 * kurrë nga `file.type` pa u parë përmbajtja.
 */
export function sniffMime(bytes: Buffer): string | null {
  const head = bytes.subarray(0, 16);
  const hex = head.toString("hex");

  if (hex.startsWith("ffd8ff")) return "image/jpeg";
  if (hex.startsWith("89504e470d0a1a0a")) return "image/png";
  if (hex.startsWith("47494638")) return "image/gif";
  if (head.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }

  const brand = bytes.subarray(4, 8).toString("ascii");
  if (brand === "ftyp") {
    const major = bytes.subarray(8, 12).toString("ascii");
    if (major.startsWith("qt")) return "video/quicktime";
    if (major.startsWith("heic") || major.startsWith("heix") || major.startsWith("mif1")) return "image/heic";
    return "video/mp4";
  }

  if (hex.startsWith("1a45dfa3")) return "video/webm";
  return null;
}

/** Lloji nga prapashtesa, kur shfletuesi e dërgon skedarin pa lloj (ndodh me .docx te Windows). */
export function mimeFromName(name: string): string {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const match = Object.entries(DOCUMENT_TYPES).find(([, value]) => value === extension);
  return match?.[0] ?? "";
}
