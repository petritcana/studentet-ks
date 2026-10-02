import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversationView } from "@/components/messages/conversation-view";
import { GroupChatDialog } from "@/components/messages/group-chat-dialog";
import { LeaveGroupButton } from "@/components/messages/leave-group-button";
import { timeAgo } from "@/lib/format";
import { getConversation, getGroupCandidates } from "@/lib/queries/messages";
import { MAX_GROUP_CHAT_MEMBERS } from "@/lib/constants";
import { getPresence } from "@/lib/queries/presence";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("messages");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, me, locale] = await Promise.all([params, requireUser(), getLocale()]);

  const conversation = await getConversation(id, me.id, locale);
  if (!conversation) notFound();

  const group = conversation.group;
  const [presence, tPresence, tMessages, candidates] = await Promise.all([
    conversation.other ? getPresence(conversation.other.id) : Promise.resolve(null),
    getTranslations("presence"),
    getTranslations("messages"),
    group ? getGroupCandidates(me.id, group.members.map((member) => member.id)) : Promise.resolve([]),
  ]);
  const memberCount = group ? group.members.length + 1 : 0;

  return (
    <div className="w-full">
      <ConversationView
        conversationId={conversation.id}
        me={{ id: me.id, name: me.name, username: me.username, avatar: me.avatar }}
        other={conversation.other}
        group={group}
        groupActions={
          group ? (
            <>
              {memberCount < MAX_GROUP_CHAT_MEMBERS ? (
                <GroupChatDialog
                  conversationId={conversation.id}
                  currentCount={memberCount}
                  candidates={candidates}
                  trigger={
                    <Button variant="ghost" size="iconSm" aria-label={tMessages("addMembers")} title={tMessages("addMembers")}>
                      <UserPlus />
                    </Button>
                  }
                />
              ) : null}
              <LeaveGroupButton conversationId={conversation.id} />
            </>
          ) : null
        }
        messages={conversation.messages}
        typing={conversation.typing}
        onlineCount={conversation.onlineCount}
        today={conversation.today}
        myRole={conversation.myRole}
        mutedUntil={conversation.mutedUntil}
        rules={conversation.rules}
        memberRoles={conversation.memberRoles}
        activeCall={conversation.activeCall}
        isAccepted={conversation.isAccepted}
        presence={
          presence
            ? {
                status: presence.status,
                lastSeenLabel: presence.lastSeenAt
                  ? tPresence("lastActive", { time: timeAgo(presence.lastSeenAt, locale) })
                  : null,
              }
            : null
        }
      />
    </div>
  );
}
