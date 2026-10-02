import { db } from "@/lib/db";
import { canViewMediaAsset } from "@/lib/media-access";
import { getCurrentUser } from "@/lib/session";
import { getObject } from "@/lib/storage";

/** Shërbimi i një skedari të ngarkuar. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me) return new Response(null, { status: 401 });

  const { id } = await params;

  const asset = await db.mediaAsset.findUnique({
    where: { id },
    select: { extension: true, mime: true, ownerId: true, kind: true },
  });
  if (!asset) return new Response(null, { status: 404 });

  // Sesioni nuk mjafton: skedari ndjek rregullat e përmbajtjes ku është bashkëngjitur.
  if (!(await canViewMediaAsset(me.access, id, asset.ownerId))) {
    return new Response(null, { status: 403 });
  }

  const bytes = await getObject(id, asset.extension);
  if (!bytes) return new Response(null, { status: 404 });

  const headers: Record<string, string> = {
    "content-type": asset.mime,
    "accept-ranges": "bytes",
    "cache-control": "private, max-age=31536000, immutable",
    // Shfletuesi nuk e hamendëson llojin: një skedar mbetet ai që tha serveri.
    "x-content-type-options": "nosniff",
  };
  // Fotoja e ID-së nuk ruhet në asnjë cache: as te shfletuesi i moderatorit.
  const idDocument = await db.verification.findFirst({
    where: { idDocumentRef: `/api/media/${id}` },
    select: { id: true },
  });
  if (idDocument) headers["cache-control"] = "no-store";
  // Dokumentet shkarkohen, nuk hapen brenda faqes sonë. Emrin e jep lidhja me `download`.
  if (asset.kind === "file") headers["content-disposition"] = "attachment";

  /*
    Safari nuk e luan dot një video ose një zë pa kërkesa me `Range`: e pyet
    serverin për bajtat e parë dhe, pa përgjigje 206, e quan skedarin të prishur.
    Chrome e duron, prandaj mungesa nuk dukej derisa u shfaqën mesazhet e zërit.
  */
  const range = parseRange(request.headers.get("range"), bytes.length);
  if (range === "invalid") {
    return new Response(null, { status: 416, headers: { "content-range": `bytes */${bytes.length}` } });
  }
  if (range) {
    const [start, end] = range;
    return new Response(new Uint8Array(bytes.subarray(start, end + 1)), {
      status: 206,
      headers: {
        ...headers,
        "content-length": String(end - start + 1),
        "content-range": `bytes ${start}-${end}/${bytes.length}`,
      },
    });
  }

  return new Response(new Uint8Array(bytes), {
    headers: { ...headers, "content-length": String(bytes.length) },
  });
}

/** `bytes=start-end` si çift i përfshirë, ose null kur nuk kërkohet pjesë. */
function parseRange(header: string | null, size: number): [number, number] | "invalid" | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  let start: number;
  let end: number;

  if (rawStart === "") {
    // `bytes=-500`: pesëqind bajtat e fundit.
    const suffix = Number(rawEnd);
    if (!suffix) return "invalid";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
  }

  if (start >= size || start > end) return "invalid";
  return [start, end];
}
