import { db } from "@/lib/db";
import { cleanFileName, type MediaKind, type MediaRef } from "@/lib/media";

/**
 * Bashkëngjitjet e një mesazhi, të rindërtuara nga baza.
 *
 * Klienti dërgon vetëm id-të dhe emrin e skedarit. Lloji, prapashtesa, përmasat
 * dhe madhësia merren nga `MediaAsset`, dhe pranohen vetëm skedarët që i ka
 * ngarkuar vetë dërguesi (`MediaUpload`). Kështu një id e huaj, ose një foto e
 * shpallur si dokument, nuk hyn dot në bisedë.
 */
export async function resolveAttachments(userId: string, refs: MediaRef[], max = 4): Promise<MediaRef[]> {
  const wanted = refs.slice(0, max);
  if (wanted.length === 0) return [];

  const uploads = await db.mediaUpload.findMany({
    where: { userId, assetId: { in: wanted.map((ref) => ref.id) } },
    select: {
      asset: {
        select: { id: true, kind: true, extension: true, width: true, height: true, durationMs: true, bytes: true },
      },
    },
  });
  const assets = new Map(uploads.map((row) => [row.asset.id, row.asset]));

  return wanted.flatMap((ref) => {
    const asset = assets.get(ref.id);
    if (!asset) return [];
    const kind = asset.kind as MediaKind;
    const base: MediaRef = {
      id: asset.id,
      kind,
      extension: asset.extension,
      width: asset.width,
      height: asset.height,
      durationMs: asset.durationMs,
    };
    return [kind === "file" ? { ...base, name: cleanFileName(ref.name ?? ""), bytes: asset.bytes } : base];
  });
}
