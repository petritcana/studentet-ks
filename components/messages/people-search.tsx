"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MessageCircle, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { VerifiedMark } from "@/components/identity/verified-mark";
import { findPeopleToMessage, startConversation, type MessageCandidate } from "@/lib/actions/messages";
import { cn } from "@/lib/utils";

/**
 * Kërkimi i njerëzve për t'u shkruar.
 *
 * Pa tekst tregon shokët dhe ata që ndjek; me tekst kërkon në tërë platformën.
 * Prekja e një personi hap bisedën ekzistuese ose nis një të re, pa kaluar nga
 * profili.
 */
export function PeopleSearch({
  autoFocus = false,
  showSuggestions = true,
  onOpened,
  className,
}: {
  autoFocus?: boolean;
  /** Te faqja e mesazheve lista del vetëm kur shkruhet diçka; te dialogu edhe bosh. */
  showSuggestions?: boolean;
  onOpened?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const t = useTranslations("messages");
  const errors = useTranslations("errors");
  const social = useTranslations("social");

  const [query, setQuery] = React.useState("");
  const [people, setPeople] = React.useState<MessageCandidate[] | null>(null);
  const [opening, setOpening] = React.useState<string | null>(null);

  const active = showSuggestions || query.trim().length >= 2;

  React.useEffect(() => {
    if (!active) {
      setPeople(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const found = await findPeopleToMessage(query);
      if (!cancelled) setPeople(found);
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, active]);

  async function open(person: MessageCandidate) {
    setOpening(person.id);
    const result = await startConversation(person.id);
    setOpening(null);
    if (!result.ok || !result.conversationId) {
      const key = result.messageKey ?? "";
      toast.error(key.startsWith("social.") ? social(key.replace("social.", "")) : errors("generic"));
      return;
    }
    onOpened?.();
    router.push(`/mesazhe/${result.conversationId}`);
  }

  const searching = query.trim().length >= 2;

  return (
    <div className={cn("flex flex-col gap-2", className)} data-people-search>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchToMessage")}
          aria-label={t("searchToMessage")}
          autoFocus={autoFocus}
          className="h-11 pl-10"
        />
      </div>

      {active ? (
        <div className="flex flex-col gap-1">
          {!searching ? (
            <p className="px-1 text-xs font-medium text-text-muted">{t("suggestedPeople")}</p>
          ) : null}

          {people === null ? (
            <ul className="flex flex-col gap-1" aria-hidden>
              {Array.from({ length: 3 }, (_, index) => (
                <li key={index} className="shimmer h-14 rounded-control" />
              ))}
            </ul>
          ) : people.length === 0 ? (
            <p className="px-1 py-4 text-center text-sm text-text-muted">
              {searching ? t("noPeopleFound") : t("noSuggestions")}
            </p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-0.5 overflow-y-auto scrollbar-thin" data-people-results>
              {people.map((person) => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => void open(person)}
                    disabled={opening !== null}
                    className="flex w-full items-center gap-3 rounded-control px-2 py-2 text-left transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-60"
                  >
                    <Avatar name={person.name} src={person.avatar} size="md" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-text">{person.name}</span>
                        {person.isVerified ? <VerifiedMark size="sm" withTooltip={false} /> : null}
                      </span>
                      <span className="truncate text-xs text-text-muted">
                        @{person.username}
                        {person.context ? ` · ${person.context}` : ""}
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold text-text">
                      <MessageCircle className="size-3.5" aria-hidden />
                      {opening === person.id ? t("opening") : t("write")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
