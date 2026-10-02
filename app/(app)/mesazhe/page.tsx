import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";
import { GroupChatDialog } from "@/components/messages/group-chat-dialog";
import { NewChatDialog } from "@/components/messages/new-chat-dialog";
import { PeopleSearch } from "@/components/messages/people-search";
import { ConversationRow } from "@/components/messages/conversation-list";
import { EmptyState } from "@/components/shared/empty-state";
import { getConversations, getGroupCandidates } from "@/lib/queries/messages";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("messages");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const [me, locale, t, te] = await Promise.all([
    requireUser(),
    getLocale(),
    getTranslations("messages"),
    getTranslations("empty"),
  ]);
  const kindLabels = { voice: t("voiceMessage"), media: t("mediaMessage"), call: t("callMessage"), post: t("postMessage") };

  const [{ accepted, requests }, candidates] = await Promise.all([
    getConversations(me.id, locale),
    getGroupCandidates(me.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-text">{t("title")}</h1>
          <p className="measure text-sm text-text-muted">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={null}>
            <NewChatDialog />
          </Suspense>
          <GroupChatDialog
            candidates={candidates}
            trigger={
              <Button variant="secondary" size="sm">
                <Users />
                {t("newGroup")}
              </Button>
            }
          />
        </div>
      </header>

      {/* Kërkimi i njerëzve: shkruaj emrin dhe hap bisedën, pa kaluar nga profili. */}
      <PeopleSearch showSuggestions={false} />

      {/* Te kompjuteri lista rri në kolonën majtas; këtu mbetet ftesa për të zgjedhur. */}
      <div className="hidden lg:block" data-pick-conversation>
        <EmptyState illustration="messages" title={t("pickTitle")} description={t("pickBody")} />
      </div>

      <div className="flex flex-col gap-5 lg:hidden">
        {requests.length > 0 ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-text">
              {t("requests", { count: requests.length })}
            </h2>
            <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {requests.map((item) => (
                <ConversationRow key={item.id} item={item} youLabel={t("you")} requestLabel={t("request")} kindLabels={kindLabels} mutedLabel={t("mutedBadge")} />
              ))}
            </ul>
          </section>
        ) : null}

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-text">{t("conversations")}</h2>

          {accepted.length === 0 ? (
            <EmptyState illustration="messages" title={te("messages.title")} description={t("empty")} />
          ) : (
            <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
              {accepted.map((item) => (
                <ConversationRow key={item.id} item={item} youLabel={t("you")} kindLabels={kindLabels} mutedLabel={t("mutedBadge")} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
