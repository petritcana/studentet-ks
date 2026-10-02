"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BellOff, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TimeAgo } from "@/components/shared/time-ago";
import { UserIdentityLine } from "@/components/identity/user-identity-line";
import type { ConversationSummary } from "@/lib/queries/messages";
import { cn } from "@/lib/utils";

/**
 * Lista e bisedave në kolonën e majtë të kompjuterit.
 *
 * Biseda e hapur ndriçon, dhe lista rifreskohet vetë çdo pak sekonda që mesazhet
 * e reja të ngjiten lart pa e rihapur faqen. Në celular lista jeton te `/mesazhe`.
 */
export function ConversationList({
  initial,
}: {
  initial: ConversationSummary[];
}) {
  const t = useTranslations("messages");
  const pathname = usePathname();
  const [items, setItems] = React.useState(initial);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => setItems(initial), [initial]);

  React.useEffect(() => {
    let stopped = false;
    async function pull() {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/mesazhe", { cache: "no-store" });
        if (!response.ok || stopped) return;
        const data = (await response.json()) as {
          items: ConversationSummary[];
        };
        setItems(data.items);
      } catch {
        // Rrahja e radhës e sjell.
      }
    }
    const timer = window.setInterval(pull, 8000);
    document.addEventListener("visibilitychange", pull);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", pull);
    };
  }, []);

  const kindLabels = {
    voice: t("voiceMessage"),
    media: t("mediaMessage"),
    call: t("callMessage"),
    post: t("postMessage"),
  };

  // Kërkimi te bisedat: emri i personit, @username ose titulli i grupit.
  const needle = query.trim().toLocaleLowerCase("sq");
  const shown = needle
    ? items.filter((item) =>
        [item.group?.title, item.other?.name, item.other?.username].some(
          (value) => value?.toLocaleLowerCase("sq").includes(needle),
        ),
      )
    : items;

  if (items.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-sm text-text-muted">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="px-1 pt-1">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchConversations")}
          aria-label={t("searchConversations")}
          icon={<Search />}
          className="h-9"
          data-conversation-search
        />
      </div>
      {shown.length === 0 ? (
        <p className="px-3 py-4 text-center text-sm text-text-muted">
          {t("noConversationMatch")}
        </p>
      ) : null}
      <ul className="flex flex-col gap-0.5" data-conversation-list>
        {shown.map((item) => (
          <ConversationRow
            key={item.id}
            item={item}
            active={pathname === `/mesazhe/${item.id}`}
            youLabel={t("you")}
            requestLabel={item.isAccepted ? undefined : t("request")}
            kindLabels={kindLabels}
            mutedLabel={t("mutedBadge")}
            compact
          />
        ))}
      </ul>
    </div>
  );
}

export function ConversationRow({
  item,
  youLabel,
  requestLabel,
  kindLabels,
  active = false,
  compact = false,
  mutedLabel,
}: {
  item: ConversationSummary;
  youLabel: string;
  requestLabel?: string;
  kindLabels: { voice: string; media: string; call: string; post: string };
  active?: boolean;
  /** Në kolonën e ngushtë rreshti ka kënde të rrumbullakëta në vend të vijave. */
  compact?: boolean;
  mutedLabel: string;
}) {
  const lastText =
    item.lastMessage?.kind === "voice"
      ? kindLabels.voice
      : item.lastMessage?.kind === "media"
        ? kindLabels.media
        : item.lastMessage?.kind === "call"
          ? kindLabels.call
          : item.lastMessage?.kind === "post"
            ? kindLabels.post
            : item.lastMessage?.text;
  const fresh = item.unread > 0 && !active;

  const badges = (
    <span className="flex items-center gap-2">
      {requestLabel ? <Badge variant="warning">{requestLabel}</Badge> : null}
      {item.muted ? (
        <BellOff
          className="size-3.5 text-text-muted"
          aria-label={mutedLabel}
          data-row-muted
        />
      ) : null}
      {item.lastMessage ? (
        <TimeAgo
          value={item.lastMessage.createdAt}
          className={cn(
            "tabular text-[11px]",
            fresh ? "font-semibold text-brand-500" : "text-text-muted",
          )}
        />
      ) : null}
    </span>
  );

  /*
    E palexuara duhet të kapet me një shikim: emri dhe mesazhi i fundit dalin
    më të theksuar, dhe numri rri në fund të rreshtit, aty ku syri mbaron.
  */
  const preview = item.lastMessage ? (
    <span className="flex items-center gap-2 pl-11">
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-xs",
          fresh ? "font-medium text-text" : "text-text-muted",
        )}
      >
        {item.lastMessage.mine
          ? youLabel
          : item.group && item.lastMessage.authorName
            ? `${item.lastMessage.authorName}: `
            : ""}
        {lastText}
      </span>
      {fresh ? (
        <span className="tabular grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-on-primary">
          {item.unread}
        </span>
      ) : null}
    </span>
  ) : null;

  const row = cn(
    "group flex flex-col gap-1 px-3 py-3 transition-colors duration-150 hover:bg-surface-2/60 focus-visible:bg-surface-2/60 focus-visible:outline-none",
    compact && "rounded-control",
    active && "bg-brand-50 hover:bg-brand-50",
  );

  if (item.group) {
    const [first, second] = item.group.members;
    return (
      <li>
        <Link
          href={`/mesazhe/${item.id}`}
          className={row}
          aria-current={active ? "page" : undefined}
        >
          <span className="flex items-center gap-3">
            {/* Dy fytyra të mbivendosura brenda vendit të një avatari, pa shkelur emrin. */}
            <span className="relative size-8 shrink-0" aria-hidden>
              {first ? (
                <Avatar
                  name={first.name}
                  src={first.avatar}
                  size="xs"
                  className="absolute left-0 top-0 size-[22px] border-2 border-surface text-[9px]"
                />
              ) : null}
              {second ? (
                <Avatar
                  name={second.name}
                  src={second.avatar}
                  size="xs"
                  className="absolute bottom-0 right-0 size-[22px] border-2 border-surface text-[9px]"
                />
              ) : null}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm text-text",
                fresh ? "font-semibold" : "font-medium",
              )}
            >
              {item.group.title}
            </span>
            {badges}
          </span>
          {preview}
        </Link>
      </li>
    );
  }

  if (!item.other) return null;

  return (
    <li>
      <Link
        href={`/mesazhe/${item.id}`}
        className={row}
        aria-current={active ? "page" : undefined}
      >
        <UserIdentityLine
          user={item.other}
          size="sm"
          linked={false}
          showFaculty={false}
          showYear={false}
          className="min-w-0"
          trailing={badges}
        />
        {preview}
      </Link>
    </li>
  );
}
