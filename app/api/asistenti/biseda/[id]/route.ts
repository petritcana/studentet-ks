import { NextResponse } from "next/server";
import { parseAttachments } from "@/lib/ai/history";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * Një bisedë e asistentit: mesazhet, dhe fshirja.
 *
 * Çdo kërkesë kontrollon pronarin. Një id e huaj kthen 404, jo 403: studenti
 * tjetër nuk mëson as që biseda ekziston.
 *
 * Mesazhet vijnë nga fundi, tridhjetë në herë. Biseda e gjatë hapet menjëherë te
 * pjesa e fundit, dhe më të vjetrat ngarkohen kur studenti ngjitet lart.
 */
export const dynamic = "force-dynamic";

const PAGE = 30;

async function owned(id: string, userId: string) {
  return db.aiConversation.findFirst({
    where: { id, userId },
    select: { id: true, title: true, contextKind: true, contextId: true },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = await owned(id, me.id);
  if (!conversation) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const before = new URL(request.url).searchParams.get("before");
  const anchor = before
    ? await db.aiMessage.findFirst({ where: { id: before, conversationId: id }, select: { createdAt: true } })
    : null;

  const rows = await db.aiMessage.findMany({
    where: { conversationId: id, ...(anchor ? { createdAt: { lt: anchor.createdAt } } : {}) },
    orderBy: { createdAt: "desc" },
    take: PAGE + 1,
    select: { id: true, role: true, content: true, attachments: true, sourceIds: true, createdAt: true },
  });

  const page = rows.slice(0, PAGE).reverse();

  // Burimet e cituara, me titull, që kartat të dalin njësoj si në çastin e përgjigjes.
  const sourceIds = [
    ...new Set(page.flatMap((row) => (JSON.parse(row.sourceIds || "[]") as string[]) ?? [])),
  ];
  const materials = sourceIds.length
    ? await db.material.findMany({
        where: { id: { in: sourceIds } },
        select: { id: true, title: true, course: { select: { name: true } } },
      })
    : [];
  const byId = new Map(materials.map((material) => [material.id, material]));

  return NextResponse.json({
    id: conversation.id,
    title: conversation.title,
    messages: page.map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      images: parseAttachments(row.attachments).map((attachment) => attachment.id),
      sources: ((JSON.parse(row.sourceIds || "[]") as string[]) ?? [])
        .map((materialId) => byId.get(materialId))
        .filter((material) => material !== undefined)
        .map((material) => ({
          materialId: material.id,
          title: material.title,
          courseName: material.course.name,
          chunk: 0,
          excerpt: "",
        })),
    })),
    more: rows.length > PAGE,
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = await owned(id, me.id);
  if (!conversation) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const attached = await db.aiMessage.findMany({
    where: { conversationId: id, attachments: { not: "[]" } },
    select: { attachments: true },
  });
  const imageIds = [...new Set(attached.flatMap((row) => parseAttachments(row.attachments).map((item) => item.id)))];

  // Mesazhet fshihen bashkë me bisedën (cascade).
  await db.aiConversation.delete({ where: { id } });

  /*
    Imazhet e bisedës fshihen bashkë me të, kur nuk i përdor asgjë tjetër. Ruajtja
    bëhet sipas përmbajtjes, prandaj e njëjta foto mund të jetë edhe në një postim
    ose në një bisedë tjetër: atëherë mbetet.
  */
  for (const imageId of imageIds) {
    const [ai, post, message, story, profile] = await Promise.all([
      db.aiMessage.count({ where: { attachments: { contains: imageId } } }),
      db.post.count({ where: { media: { contains: imageId } } }),
      db.message.count({ where: { media: { contains: imageId } } }),
      db.story.count({ where: { mediaUrl: { contains: imageId } } }),
      db.user.count({ where: { OR: [{ avatar: { contains: imageId } }, { cover: { contains: imageId } }] } }),
    ]);
    if (ai + post + message + story + profile === 0) {
      await db.mediaAsset.deleteMany({ where: { id: imageId } });
    }
  }

  return NextResponse.json({ ok: true });
}
