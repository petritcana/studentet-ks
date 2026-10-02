import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { parseMedia } from "@/lib/media";
import { extractLinks, linkHref } from "@/lib/chat-rules";

/**
 * Çfarë është ndarë në një bisedë: fotot dhe videot, skedarët dhe linqet.
 *
 * Studenti nuk ka pse të rrëshqasë gjithë bisedën për shënimet që i dërgoi
 * dikush para dy javësh. E sheh vetëm anëtari i bisedës; skedarët hapen prapë
 * vetëm përmes `/api/media/[id]`, me kontrollin e vet.
 */
export const dynamic = "force-dynamic";

const SCAN = 1500;
const LIMIT = 120;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return new Response(null, { status: 401 });
  const { id } = await params;

  const member = await db.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: me.id } },
    select: { id: true },
  });
  if (!member) return new Response(null, { status: 404 });

  const rows = await db.message.findMany({
    where: { conversationId: id, deletedAt: null, kind: { notIn: ["call", "voice"] } },
    orderBy: { createdAt: "desc" },
    take: SCAN,
    select: { id: true, text: true, media: true, createdAt: true, author: { select: { name: true } } },
  });

  const media: { id: string; kind: "image" | "video"; messageId: string }[] = [];
  const files: { id: string; name: string; extension: string; bytes: number; messageId: string; author: string; createdAt: string }[] = [];
  const links: { url: string; href: string; messageId: string; author: string; createdAt: string }[] = [];

  for (const row of rows) {
    for (const item of parseMedia(row.media)) {
      if ((item.kind === "image" || item.kind === "video") && media.length < LIMIT) {
        media.push({ id: item.id, kind: item.kind, messageId: row.id });
      } else if (item.kind === "file" && files.length < LIMIT) {
        files.push({
          id: item.id,
          name: item.name ?? `skedar.${item.extension}`,
          extension: item.extension ?? "",
          bytes: item.bytes ?? 0,
          messageId: row.id,
          author: row.author.name,
          createdAt: row.createdAt.toISOString(),
        });
      }
    }
    for (const url of extractLinks(row.text)) {
      if (links.length >= LIMIT) break;
      links.push({ url, href: linkHref(url), messageId: row.id, author: row.author.name, createdAt: row.createdAt.toISOString() });
    }
  }

  return Response.json({ media, files, links });
}
