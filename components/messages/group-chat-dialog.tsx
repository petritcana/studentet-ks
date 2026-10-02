"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { addGroupMembers, createGroupChat } from "@/lib/actions/messages";
import { MAX_GROUP_CHAT_MEMBERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type GroupCandidate = { id: string; name: string; username: string; avatar: string | null };

/**
 * Krijimi i grupit dhe shtimi i anëtarëve ndajnë të njëjtën listë njerëzish.
 * Kur `conversationId` vjen, dialogu vetëm shton, pa emër grupi.
 */
export function GroupChatDialog({
  candidates,
  conversationId,
  currentCount = 1,
  trigger,
}: {
  candidates: GroupCandidate[];
  conversationId?: string;
  currentCount?: number;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("messages");
  const tc = useTranslations("common");

  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [picked, setPicked] = React.useState<string[]>([]);
  const [pending, startTransition] = React.useTransition();

  const adding = Boolean(conversationId);
  const room = MAX_GROUP_CHAT_MEMBERS - currentCount;
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? candidates.filter((person) => person.name.toLowerCase().includes(needle) || person.username.includes(needle))
    : candidates;

  function toggle(id: string) {
    setPicked((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= room) {
        toast.error(t("groupTooLarge", { max: MAX_GROUP_CHAT_MEMBERS }));
        return current;
      }
      return [...current, id];
    });
  }

  const canSubmit = adding ? picked.length > 0 : title.trim().length >= 2 && picked.length >= 2;

  function submit() {
    startTransition(async () => {
      if (conversationId) {
        const result = await addGroupMembers(conversationId, picked);
        if (!result.ok) {
          toast.error(t("groupTooLarge", { max: MAX_GROUP_CHAT_MEMBERS }));
          return;
        }
        toast.success(t("membersAdded"));
        setOpen(false);
        setPicked([]);
        router.refresh();
        return;
      }

      const result = await createGroupChat(title, picked);
      if (!result.ok || !result.conversationId) {
        const key = result.messageKey ?? "";
        toast.error(
          key === "messages.groupNameInvalid"
            ? t("groupNameInvalid")
            : key === "messages.groupTooSmall"
              ? t("groupTooSmall")
              : key === "messages.groupTooLarge"
                ? t("groupTooLarge", { max: MAX_GROUP_CHAT_MEMBERS })
                : tc("retry"),
        );
        return;
      }
      setOpen(false);
      router.push(`/mesazhe/${result.conversationId}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{adding ? t("addMembers") : t("newGroup")}</DialogTitle>
          <DialogDescription>{t("groupHint", { max: MAX_GROUP_CHAT_MEMBERS })}</DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-3">
          {adding ? null : (
            <Input
              value={title}
              maxLength={60}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("groupNamePlaceholder")}
              aria-label={t("groupName")}
            />
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPeople")}
              aria-label={t("searchPeople")}
              className="pl-9"
            />
          </div>

          <p className="tabular text-xs text-text-muted">
            {t("selectedCount", { count: picked.length, max: room })}
          </p>

          {candidates.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">{t("noCandidates")}</p>
          ) : (
            <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto scrollbar-thin">
              {shown.map((person) => {
                const selected = picked.includes(person.id);
                return (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() => toggle(person.id)}
                      aria-pressed={selected}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors duration-150 hover:bg-surface-2",
                        selected && "bg-brand-500/10",
                      )}
                    >
                      <Avatar name={person.name} src={person.avatar} size="sm" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium text-text">{person.name}</span>
                        <span className="truncate text-xs text-text-muted">@{person.username}</span>
                      </span>
                      <span
                        className={cn(
                          "grid size-5 place-items-center rounded-full border",
                          selected ? "border-brand-500 bg-brand-500 text-brand-contrast" : "border-border",
                        )}
                      >
                        {selected ? <Check className="size-3.5" strokeWidth={3} /> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={submit} loading={pending} disabled={!canSubmit}>
            {adding ? t("addMembers") : t("createGroup")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
