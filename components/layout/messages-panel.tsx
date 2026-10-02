"use client";

import { TimeAgo } from "@/components/shared/time-ago";
import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { MessageSquare } from "lucide-react";
import { AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SkeletonPerson } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { UserIdentityLine } from "@/components/identity/user-identity-line";
import { PeopleSearch } from "@/components/messages/people-search";
import type { PublicAuthor } from "@/lib/dto";
import { cn } from "@/lib/utils";

type ConversationRow = {
  id: string;
  isAccepted: boolean;
  unread: number;
  lastMessage: { text: string; kind: "text" | "voice" | "media" | "call" | "post"; createdAt: string; mine: boolean; authorName: string | null } | null;
  other: PublicAuthor | null;
  group: { title: string; memberCount: number; members: { name: string; avatar: string | null }[] } | null;
};

export function MessagesPanel({ initialUnread }: { initialUnread: number }) {
  const t = useTranslations("messages");
  const tc = useTranslations("common");
  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState<ConversationRow[] | null>(null);
  const [unread] = React.useState(initialUnread);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      const response = await fetch("/api/mesazhe");
      if (!response.ok) return;
      const data = await response.json();
      if (!cancelled) setRows(data.items ?? []);
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unread > 0 ? `${t("title")} (${unread})` : t("title")}
        className={cn(
          "relative grid size-10 place-items-center rounded-control text-text lg:size-[42px]",
          "transition-colors duration-150 ease-brand hover:bg-surface-2 hover:text-text",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        )}
      >
        <MessageSquare className="size-[19px]" />
        {unread > 0 ? (
          <span className="tabular absolute right-0.5 top-[3px] min-w-[18px] rounded-full bg-primary px-1 text-center text-[10.5px] font-bold leading-[18px] text-on-primary ring-2 ring-bg">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{t("title")}</SheetTitle>
            <SheetDescription>{t("subtitle")}</SheetDescription>
          </SheetHeader>

          <SheetBody className="flex flex-col gap-4">
            {/* Shkruaji dikujt pa kaluar nga profili: kërko dhe hap bisedën. */}
            <PeopleSearch showSuggestions={false} onOpened={() => setOpen(false)} />

            {rows === null ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <SkeletonPerson key={index} label={tc("loading")} />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <EmptyState illustration="messages" compact title={t("empty")} />
            ) : (
              <ul className="flex flex-col gap-1">
                {rows.map((row) =>
                  row.other || row.group ? (
                    <li key={row.id}>
                      <Link
                        href={`/mesazhe/${row.id}`}
                        onClick={() => setOpen(false)}
                        className="flex flex-col gap-1 rounded-md p-2 transition-colors duration-150 hover:bg-surface-2"
                      >
                        {row.group ? (
                          <span className="flex items-center gap-2">
                            <AvatarStack people={row.group.members} max={2} size="xs" className="w-8 shrink-0" />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{row.group.title}</span>
                            <RowBadges row={row} requestLabel={t("request")} />
                          </span>
                        ) : row.other ? (
                          <UserIdentityLine
                            user={row.other}
                            size="sm"
                            linked={false}
                            showFaculty={false}
                            showYear={false}
                            trailing={<RowBadges row={row} requestLabel={t("request")} />}
                          />
                        ) : null}
                        {row.lastMessage ? (
                          <p className="truncate pl-10 text-xs text-text-muted">
                            {row.lastMessage.mine
                              ? t("you")
                              : row.lastMessage.authorName
                                ? `${row.lastMessage.authorName}: `
                                : ""}
                            {row.lastMessage.kind === "call"
                              ? t("callMessage")
                              : row.lastMessage.kind === "post"
                                ? t("postMessage")
                              : row.lastMessage.kind === "voice"
                                ? t("voiceMessage")
                                : row.lastMessage.kind === "media"
                                  ? t("mediaMessage")
                                  : row.lastMessage.text}
                            <span className="tabular ml-2 opacity-70">
                              <TimeAgo value={row.lastMessage.createdAt} />
                            </span>
                          </p>
                        ) : null}
                      </Link>
                    </li>
                  ) : null,
                )}
              </ul>
            )}

            <Button asChild variant="ghost" size="sm" className="mt-4 w-full">
              <Link href="/mesazhe" onClick={() => setOpen(false)}>
                {tc("seeAll")}
              </Link>
            </Button>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}

function RowBadges({ row, requestLabel }: { row: ConversationRow; requestLabel: string }) {
  return (
    <span className="flex items-center gap-2">
      {!row.isAccepted ? <Badge variant="warning">{requestLabel}</Badge> : null}
      {row.unread > 0 ? (
        <span className="tabular grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-on-primary">
          {row.unread}
        </span>
      ) : null}
    </span>
  );
}
