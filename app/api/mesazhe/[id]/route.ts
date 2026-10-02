import { NextResponse } from "next/server";
import { getLocale } from "next-intl/server";
import { getConversation } from "@/lib/queries/messages";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * Gjendja e freskët e një bisede.
 *
 * Biseda duhet të ndihet si bisedë: mesazhi i tjetrit del vetë, pa e rifreskuar
 * faqen. Pa lidhje të gjallë mes shfletuesve, rruga më e sigurt është kjo, një
 * kërkesë e shkurtër çdo pak sekonda, e cila punon njësoj te serveri ynë dhe te
 * funksionet pa server, ku një lidhje e hapur nuk ka ku të jetojë.
 *
 * Leximi shënohet këtu njëkohësisht: kush e ka hapur bisedën, e ka lexuar.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const locale = await getLocale();

  const conversation = await getConversation(id, me.id, locale);
  if (!conversation) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.conversationMember.updateMany({
    where: { conversationId: id, userId: me.id },
    data: { lastReadAt: new Date() },
  });

  return NextResponse.json({
    messages: conversation.messages,
    typing: conversation.typing,
    onlineCount: conversation.onlineCount,
    activeCall: conversation.activeCall,
    rules: conversation.rules,
    myRole: conversation.myRole,
    memberRoles: conversation.memberRoles,
    mutedUntil: conversation.mutedUntil,
  });
}
