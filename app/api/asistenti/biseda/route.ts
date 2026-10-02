import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * Historiku i asistentit: lista e bisedave të studentit.
 *
 * Vetëm titulli, koha dhe një rresht nga mesazhi i fundit: mesazhet e plota
 * ngarkohen kur hapet biseda, jo këtu. Faqosja bëhet me kohën e ndryshimit të
 * fundit, sepse biseda që sapo u përdor kthehet lart.
 */
export const dynamic = "force-dynamic";

const PAGE = 30;

export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const before = url.searchParams.get("before");
  const cursor = before ? new Date(before) : null;

  const rows = await db.aiConversation.findMany({
    where: {
      userId: me.id,
      ...(cursor && !Number.isNaN(cursor.getTime()) ? { updatedAt: { lt: cursor } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: PAGE + 1,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { role: true, content: true, attachments: true },
      },
    },
  });

  const items = rows.slice(0, PAGE).map((row) => {
    const last = row.messages[0];
    const preview = last?.content.replace(/\s+/g, " ").trim().slice(0, 90) ?? "";
    return {
      id: row.id,
      title: row.title,
      updatedAt: row.updatedAt.toISOString(),
      preview,
      previewRole: last?.role ?? null,
      previewImage: Boolean(last && !preview && last.attachments !== "[]"),
    };
  });

  return NextResponse.json({
    items,
    next: rows.length > PAGE ? items[items.length - 1]?.updatedAt ?? null : null,
  });
}
