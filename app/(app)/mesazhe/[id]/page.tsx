import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { MessageThread } from "@/components/social/message-thread";
import { MutualContext } from "@/components/social/mutual-context";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getMutualContext } from "@/lib/suggestions";

export const metadata: Metadata = { title: "Biseda" };
export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const membership = await db.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: user.id } },
    select: { id: true },
  });
  if (!membership) notFound();

  const conversation = await db.conversation.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      members: {
        where: { userId: { not: user.id } },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              isVerified: true,
              year: true,
              faculty: { select: { name: true } },
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 200,
        select: { id: true, text: true, createdAt: true, authorId: true },
      },
    },
  });

  if (!conversation || conversation.members.length === 0) notFound();

  const other = conversation.members[0].user;
  const context = await getMutualContext(user.id, other.id);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={conversation.title ?? other.name} back="/mesazhe" />

      <Card className="p-4">
        <Link href={`/u/${other.username}`} className="flex items-center gap-3">
          <Avatar name={other.name} src={other.avatar} verified={other.isVerified} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text">{other.name}</p>
            <p className="truncate text-xs text-text-muted">
              {other.faculty?.name.replace("Fakulteti i ", "").replace("Fakulteti ", "")}
              {other.year ? `, viti ${other.year}` : ""}
            </p>
          </div>
        </Link>
        {context.length > 0 ? (
          <div className="mt-2">
            <MutualContext reasons={context} max={3} />
          </div>
        ) : null}
      </Card>

      <Card className="p-4">
        <MessageThread
          conversationId={conversation.id}
          viewerId={user.id}
          other={{ name: other.name, avatar: other.avatar }}
          emptyHint={
            context.length > 0
              ? context.slice(0, 2).join(" · ")
              : "Nisni nga diçka që ju lidh: një lëndë, një provim, një event."
          }
          messages={conversation.messages.map((message) => ({
            id: message.id,
            text: message.text,
            createdAt: message.createdAt.toISOString(),
            authorId: message.authorId,
          }))}
        />
      </Card>
    </div>
  );
}
