import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { timeAgoShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Mesazhe",
  description: "Bisedat e tua me shokët dhe kërkesat nga të tjerët.",
};

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const user = await requireUser();

  const memberships = await db.conversationMember.findMany({
    where: { userId: user.id },
    select: {
      lastReadAt: true,
      isAccepted: true,
      conversation: {
        select: {
          id: true,
          type: true,
          title: true,
          updatedAt: true,
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
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { text: true, createdAt: true, authorId: true },
          },
        },
      },
    },
  });

  const sorted = memberships
    .filter((item) => item.conversation.members.length > 0)
    .sort(
      (a, b) =>
        b.conversation.updatedAt.getTime() - a.conversation.updatedAt.getTime(),
    );

  const accepted = sorted.filter((item) => item.isAccepted);
  const requests = sorted.filter((item) => !item.isAccepted);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Mesazhe"
        description="Me shokët biseda është e hapur. Nga të tjerët vjen si kërkesë."
      />

      {sorted.length === 0 ? (
        <EmptyState
          illustration="messages"
          title="Ende s'ke biseda"
          description="Sapo dikush që e ndjek të ndjek edhe ty, biseda hapet vetë."
          action={
            <Button asChild>
              <Link href="/kampusi">
                <Users />
                Gjej njerëz
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {requests.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-text">
                Kërkesa ({requests.length})
              </h2>
              <Card className="divide-y divide-border">
                {requests.map((item) => (
                  <ConversationRow
                    key={item.conversation.id}
                    conversation={item.conversation}
                    lastReadAt={item.lastReadAt}
                    userId={user.id}
                    isRequest
                  />
                ))}
              </Card>
            </section>
          ) : null}

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-text">Bisedat</h2>
            {accepted.length === 0 ? (
              <EmptyState
                illustration="messages"
                compact
                title="Asnjë bisedë e hapur"
                description="Bëhu shok me dikë dhe DM-ja hapet pa kufizime."
              />
            ) : (
              <Card className="divide-y divide-border">
                {accepted.map((item) => (
                  <ConversationRow
                    key={item.conversation.id}
                    conversation={item.conversation}
                    lastReadAt={item.lastReadAt}
                    userId={user.id}
                  />
                ))}
              </Card>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function ConversationRow({
  conversation,
  lastReadAt,
  userId,
  isRequest = false,
}: {
  conversation: {
    id: string;
    type: string;
    title: string | null;
    members: {
      user: {
        id: string;
        name: string;
        username: string;
        avatar: string | null;
        isVerified: boolean;
      };
    }[];
    messages: { text: string; createdAt: Date; authorId: string }[];
  };
  lastReadAt: Date;
  userId: string;
  isRequest?: boolean;
}) {
  const other = conversation.members[0].user;
  const last = conversation.messages[0];
  const unread = Boolean(last && last.authorId !== userId && last.createdAt > lastReadAt);

  return (
    <Link
      href={`/mesazhe/${conversation.id}`}
      className={cn(
        "flex items-center gap-3 p-3 transition-colors duration-150 hover:bg-surface-2",
        unread && "bg-brand-500/6",
      )}
    >
      <Avatar name={other.name} src={other.avatar} verified={other.isVerified} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "truncate text-sm text-text",
              unread ? "font-semibold" : "font-medium",
            )}
          >
            {conversation.title ?? other.name}
          </span>
          {isRequest ? <Badge variant="warning">Kërkesë</Badge> : null}
          {last ? (
            <span className="tabular ml-auto shrink-0 text-xs text-text-muted">
              {timeAgoShort(last.createdAt)}
            </span>
          ) : null}
        </div>
        <span className="truncate text-xs text-text-muted">
          {last
            ? `${last.authorId === userId ? "Ti: " : ""}${last.text}`
            : "Ende asnjë mesazh. Nis ti."}
        </span>
      </div>
      {unread ? <span className="size-2 shrink-0 rounded-full bg-brand-500" aria-label="E palexuar" /> : null}
    </Link>
  );
}
