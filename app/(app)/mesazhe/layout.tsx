import Link from "next/link";
import { Suspense } from "react";
import { NewChatDialog } from "@/components/messages/new-chat-dialog";
import { getLocale, getTranslations } from "next-intl/server";
import { ConversationList } from "@/components/messages/conversation-list";
import { getConversations } from "@/lib/queries/messages";
import { requireUser } from "@/lib/session";

/**
 * Mesazhet në dy kolona te kompjuteri: lista majtas, biseda djathtas.
 *
 * Kolona e listës del vetëm nga `lg` e sipër. Në celular `/mesazhe` është lista
 * dhe `/mesazhe/[id]` biseda, secila në ekranin e vet.
 */
export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const [me, locale, t] = await Promise.all([requireUser(), getLocale(), getTranslations("messages")]);
  const { accepted, requests } = await getConversations(me.id, locale);

  return (
    // Anash djathtas mbetet vend për butonat pluskues (asistenti, raporti), që të mos mbulojnë dërgimin.
    <div className="flex w-full items-start gap-5 lg:pr-[76px]">
      <aside
        aria-label={t("conversations")}
        className="glass hidden h-[calc(100dvh-9rem)] w-[320px] shrink-0 flex-col gap-2 rounded-card p-2 lg:flex xl:w-[360px]"
        data-messages-column
      >
        <div className="flex items-center justify-between gap-2 px-3 pt-2">
          <Link href="/mesazhe" className="font-display text-lg font-bold text-text hover:text-brand-500">
            {t("title")}
          </Link>
          {/* «Bisedë e re»: kërko kë të duash në platformë dhe shkruaji menjëherë. */}
          <Suspense fallback={null}>
            <NewChatDialog compact />
          </Suspense>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          <ConversationList initial={[...accepted, ...requests].slice(0, 20)} />
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
