import { NextResponse } from "next/server";
import { getLocale } from "next-intl/server";
import { getConversations } from "@/lib/queries/messages";
import { getCurrentUser } from "@/lib/session";

/**
 * Lista e bisedave për panelin e shiritit të sipërm.
 *
 * Kërkesat e papranuara vijnë pas atyre të pranuara, sepse kutia nuk është vend
 * ku hyjnë të panjohurit pa leje. Emaili nuk del kurrë: DTO-ja e profilit publik
 * e kufizon vetë.
 */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ items: [] }, { status: 401 });

  const locale = await getLocale();
  const { accepted, requests } = await getConversations(me.id, locale);

  return NextResponse.json({ items: [...accepted, ...requests].slice(0, 20) });
}
