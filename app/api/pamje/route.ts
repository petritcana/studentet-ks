import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * Shënimi i një pamjeje postimi.
 *
 * Një rresht për person dhe për postim: analitika e Pro-s duhet të tregojë sa
 * veta e panë, jo sa herë u rifreskua faqja. Autori nuk numërohet te pamjet e
 * veta, sepse ndryshe numri do të ishte vetëm kureshtja e tij.
 *
 * Vjen nga shfletuesi kur karta hyn vërtet në ekran, jo kur dërgohet faqja.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((id): id is string => typeof id === "string").slice(0, 40)
    : [];
  if (ids.length === 0) return NextResponse.json({ ok: true, counted: 0 });

  const posts = await db.post.findMany({
    where: { id: { in: ids }, isHidden: false, NOT: { authorId: me.id } },
    select: { id: true },
  });

  let counted = 0;
  for (const post of posts) {
    // `createMany` me `skipDuplicates` nuk e thotë cila u shtua, dhe numëruesi
    // duhet të rritet vetëm herën e parë. Prandaj shkruhet një nga një.
    const existing = await db.postView.findUnique({
      where: { postId_userId: { postId: post.id, userId: me.id } },
      select: { postId: true },
    });
    if (existing) continue;

    await db.$transaction([
      db.postView.create({ data: { postId: post.id, userId: me.id } }),
      db.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } }),
    ]);
    counted += 1;
  }

  return NextResponse.json({ ok: true, counted });
}
