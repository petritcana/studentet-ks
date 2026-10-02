import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkMedia, cleanFileName, documentMime, MAX_STORY_VIDEO_SECONDS, sniffMime } from "@/lib/media";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";
import { joinChunks, putChunk, removeChunks } from "@/lib/storage";

/**
 * Ngarkimi i skedarëve, copë pas cope.
 *
 * Një server action e pret trupin te një megabajt dhe Netlify te gjashtë,
 * prandaj një video e një storje nuk kalonte dot si kërkesë e vetme: pikërisht
 * ky ishte gabimi që shihte studenti. Këtu skedari vjen i ndarë, ruhet si copa
 * dhe bashkohet vetëm në fund, ku edhe kontrollohet lloji dhe madhësia.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await request.formData();
  const chunk = form.get("chunk");
  const uploadId = String(form.get("uploadId") ?? "");
  const index = Number(form.get("index") ?? -1);
  const total = Number(form.get("total") ?? 0);

  // Kufiri numëron skedarët, jo copat: një foto 6MB vjen në gjashtë copa, dhe më
  // parë shteronte kufirin ditor pas pak fotosh.
  if (index === 0) {
    const limiter = rateLimit("media", me.id);
    if (!limiter.ok) return NextResponse.json({ error: "errors.rateLimited" }, { status: 429 });
  }

  if (!(chunk instanceof File) || !uploadId || !Number.isInteger(index) || index < 0 || total < 1) {
    return NextResponse.json({ error: "errors.generic" }, { status: 400 });
  }
  if (total > 200) return NextResponse.json({ error: "errors.uploadTooLarge" }, { status: 413 });

  // Id-ja e ngarkimit mban edhe pronarin, që dy studentë të mos përzihen kurrë.
  const key = `${me.id}-${uploadId}`;
  await putChunk(key, index, Buffer.from(await chunk.arrayBuffer()));

  if (index + 1 < total) return NextResponse.json({ ok: true, received: index });

  const bytes = await joinChunks(key, total);
  await removeChunks(key, total);
  if (!bytes) return NextResponse.json({ error: "errors.generic" }, { status: 400 });

  const declaredMime = String(form.get("mime") ?? "");
  const rawSurface = form.get("surface");
  const surface =
    rawSurface === "story" ||
    rawSurface === "voice" ||
    rawSurface === "ai" ||
    rawSurface === "message" ||
    rawSurface === "id"
      ? rawSurface
      : "post";

  // Lloji nuk besohet nga klienti: bajtat e parë e thonë vetë çfarë janë. Te biseda
  // lejohen edhe dokumente, dhe ato njihen po ashtu nga bajtat (`documentMime`).
  // Te biseda nuk ka kthim te lloji i deklaruar: një skedar që bajtat nuk e njohin refuzohet.
  const mime =
    surface === "message"
      ? (sniffMime(bytes) ?? documentMime(bytes, declaredMime) ?? "")
      : (sniffMime(bytes) ?? declaredMime);

  const rawDuration = form.get("duration");
  const durationSeconds = typeof rawDuration === "string" && rawDuration ? Number(rawDuration) : null;

  const verdict = checkMedia(
    { type: mime, size: bytes.length },
    Number.isFinite(durationSeconds) ? durationSeconds : null,
    surface === "story"
      ? { videoSeconds: MAX_STORY_VIDEO_SECONDS }
      : surface === "voice"
        ? { voice: true }
        : surface === "message"
          ? { files: true }
          : {},
  );
  // Asistenti dhe ID-ja studentore marrin vetëm imazhe: nuk janë ngarkim i përgjithshëm.
  if ((surface === "ai" || surface === "id") && verdict.ok && verdict.kind !== "image") {
    return NextResponse.json({ error: "errors.uploadType" }, { status: 415 });
  }
  if (!verdict.ok) {
    const error =
      verdict.reason === "size"
        ? "errors.uploadTooLarge"
        : verdict.reason === "duration"
          ? "errors.uploadTooLong"
          : "errors.uploadType";
    return NextResponse.json({ error }, { status: 415 });
  }

  const { putObject } = await import("@/lib/storage");
  const id = await putObject(bytes, verdict.extension);

  const width = numberOrNull(form.get("width"));
  const height = numberOrNull(form.get("height"));
  const durationMs =
    durationSeconds !== null && Number.isFinite(durationSeconds)
      ? Math.round(durationSeconds * 1000)
      : null;

  /*
    Skedari ruhet sipas përmbajtjes, prandaj dy studentë që ngarkojnë të njëjtën
    foto marrin të njëjtin id. Pronari i parë mbetet aty për historikun, kurse
    kush e ngarkoi vërtet shkruhet te `MediaUpload`: ndryshe i dyti nuk e vinte
    dot atë foto as si avatar të vetin.
  */
  await db.mediaAsset.upsert({
    where: { id },
    update: {},
    create: {
      id,
      ownerId: me.id,
      kind: verdict.kind,
      extension: verdict.extension,
      mime,
      bytes: bytes.length,
      width,
      height,
      durationMs,
    },
  });

  await db.mediaUpload.upsert({
    where: { assetId_userId: { assetId: id, userId: me.id } },
    update: {},
    create: { assetId: id, userId: me.id },
  });

  // Skedari mban emrin që pa studenti; fotot dhe videot nuk kanë nevojë për të.
  const name = verdict.kind === "file" ? cleanFileName(String(form.get("name") ?? "")) : undefined;

  return NextResponse.json({
    ok: true,
    media: {
      id,
      kind: verdict.kind,
      extension: verdict.extension,
      width,
      height,
      durationMs,
      ...(name ? { name, bytes: bytes.length } : {}),
    },
  });
}

function numberOrNull(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}
