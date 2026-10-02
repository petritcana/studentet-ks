"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, Search, Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SkeletonPerson } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { findPeopleToMessage, sharePost, type MessageCandidate } from "@/lib/actions/messages";
import type { ConversationSummary } from "@/lib/queries/messages";
import { cn } from "@/lib/utils";

type Target = {
  key: string;
  kind: "conversation" | "user";
  id: string;
  name: string;
  avatar: string | null;
  /** @username për njerëzit; te grupet del numri i anëtarëve. */
  hint: string | null;
  members: number | null;
};

/**
 * «Dërgo» te postimi: zgjidh shokët ose bisedat dhe postimi shkon si kartë në
 * DM, me një shënim nëse do. Pa kërkim dalin bisedat e fundit dhe shokët; me
 * kërkim, kushdo që mund t'i shkruash.
 */
export function SharePostDialog({ postId, open, onOpenChange }: { postId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("sharePost");
  const tAll = useTranslations();
  const [recent, setRecent] = React.useState<Target[] | null>(null);
  const [people, setPeople] = React.useState<Target[]>([]);
  const [query, setQuery] = React.useState("");
  const [picked, setPicked] = React.useState<Map<string, Target>>(new Map());
  const [note, setNote] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!open) return;
    setPicked(new Map());
    setNote("");
    setQuery("");
    let cancelled = false;
    void Promise.all([
      fetch("/api/mesazhe", { cache: "no-store" }).then((response) => (response.ok ? response.json() : { items: [] })),
      findPeopleToMessage(""),
    ]).then(([data, friends]: [{ items: ConversationSummary[] }, MessageCandidate[]]) => {
      if (cancelled) return;
      const chats: Target[] = data.items
        .filter((item) => item.isAccepted)
        .slice(0, 8)
        .map((item) => ({
          key: `c:${item.id}`,
          kind: "conversation",
          id: item.id,
          name: item.group?.title ?? item.other?.name ?? "",
          avatar: item.group ? (item.group.members[0]?.avatar ?? null) : (item.other?.avatar ?? null),
          hint: item.other ? `@${item.other.username}` : null,
          members: item.group ? item.group.memberCount : null,
        }));
      setRecent(chats);
      setPeople(friends.map(toTarget));
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Kërkimi: pret pak pasi ndalet shkrimi, që të mos pyesë serverin për çdo shkronjë.
  React.useEffect(() => {
    if (!open) return;
    const value = query.trim();
    const timer = window.setTimeout(() => {
      void findPeopleToMessage(value).then((rows) => setPeople(rows.map(toTarget)));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  function toggle(target: Target) {
    setPicked((current) => {
      const next = new Map(current);
      if (next.has(target.key)) next.delete(target.key);
      else if (next.size < 20) next.set(target.key, target);
      return next;
    });
  }

  function send() {
    const chosen = [...picked.values()];
    startTransition(async () => {
      const result = await sharePost(
        postId,
        {
          userIds: chosen.filter((item) => item.kind === "user").map((item) => item.id),
          conversationIds: chosen.filter((item) => item.kind === "conversation").map((item) => item.id),
        },
        note,
      );
      if (!result.ok) {
        toast.error(tAll(result.messageKey ?? "common.retry"));
        return;
      }
      toast.success(t("sent", { count: result.sent ?? chosen.length }));
      onOpenChange(false);
    });
  }

  const shownRecent = query.trim() ? [] : (recent ?? []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-share-dialog>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("body")}</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            icon={<Search />}
            data-share-search
          />

          {picked.size > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {[...picked.values()].map((target) => (
                <button
                  key={target.key}
                  type="button"
                  onClick={() => toggle(target)}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-500"
                >
                  {target.name} ×
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto scrollbar-thin" data-share-targets>
            {recent === null ? (
              Array.from({ length: 4 }).map((_, index) => <SkeletonPerson key={index} label={t("loading")} />)
            ) : (
              <>
                {shownRecent.length > 0 ? <p className="px-1 pt-1 text-xs font-semibold text-text-muted">{t("recent")}</p> : null}
                {shownRecent.map((target) => (
                  <TargetRow key={target.key} target={target} selected={picked.has(target.key)} onToggle={() => toggle(target)} />
                ))}
                {people.length > 0 ? <p className="px-1 pt-2 text-xs font-semibold text-text-muted">{query.trim() ? t("results") : t("friends")}</p> : null}
                {people
                  .filter((target) => !shownRecent.some((chat) => chat.hint === target.hint))
                  .map((target) => (
                    <TargetRow key={target.key} target={target} selected={picked.has(target.key)} onToggle={() => toggle(target)} />
                  ))}
                {people.length === 0 && shownRecent.length === 0 ? <p className="py-4 text-center text-sm text-text-muted">{t("nobody")}</p> : null}
              </>
            )}
          </div>

          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            rows={2}
            className="min-h-0"
            placeholder={t("note")}
            aria-label={t("note")}
            data-share-note
          />
        </DialogBody>
        <DialogFooter>
          <Button onClick={send} disabled={picked.size === 0} loading={pending} data-share-send>
            <Send />
            {picked.size > 1 ? t("sendMany", { count: picked.size }) : t("send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toTarget(person: MessageCandidate): Target {
  return { key: `u:${person.id}`, kind: "user", id: person.id, name: person.name, avatar: person.avatar, hint: `@${person.username}`, members: null };
}

function TargetRow({ target, selected, onToggle }: { target: Target; selected: boolean; onToggle: () => void }) {
  const t = useTranslations("sharePost");
  const hint = target.members !== null ? t("groupHint", { count: target.members }) : target.hint;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        "flex items-center gap-3 rounded-control px-2 py-1.5 text-left transition-colors",
        selected ? "bg-brand-50" : "hover:bg-surface-2",
      )}
      data-share-target={target.key}
    >
      <Avatar name={target.name} src={target.avatar} size="sm" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-text">{target.name}</span>
        {hint ? <span className="truncate text-xs text-text-muted">{hint}</span> : null}
      </span>
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border-2",
          selected ? "border-brand-500 bg-brand-500 text-brand-contrast" : "border-border-strong",
        )}
        aria-hidden
      >
        {selected ? <Check className="size-3" /> : null}
      </span>
    </button>
  );
}
