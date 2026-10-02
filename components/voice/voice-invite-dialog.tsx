"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, Link2, Search, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { inviteToVoiceRoom, listVoiceInvitees, type VoiceInvitee } from "@/lib/actions/voice";

/**
 * «Fto» te dhoma e zërit.
 *
 * Lista nis me njerëzit që ndjek ose që të ndjekin, dhe kërkimi e ngushton. I
 * ftuari merr njoftim që e çon drejt te dhoma. Ftesa e pritësit ose e
 * moderatorit e hap derën edhe pa fjalëkalim; lidhja kopjohet për të tjerët.
 */
export function VoiceInviteDialog({ roomId, grantsEntry }: { roomId: string; grantsEntry: boolean }) {
  const t = useTranslations("voice");
  const tAll = useTranslations();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [people, setPeople] = React.useState<VoiceInvitee[] | null>(null);
  const [sending, setSending] = React.useState<string | null>(null);

  // Kërkimi pret pak pas shkrimit, që çdo shkronjë të mos jetë një kërkesë.
  React.useEffect(() => {
    if (!open) return;
    let alive = true;
    const timer = window.setTimeout(() => {
      void listVoiceInvitees(roomId, query).then((rows) => {
        if (alive) setPeople(rows);
      });
    }, query ? 250 : 0);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [open, query, roomId]);

  async function invite(person: VoiceInvitee) {
    setSending(person.id);
    const result = await inviteToVoiceRoom(roomId, person.id);
    setSending(null);
    if (!result.ok) {
      toast.error(tAll(result.messageKey ?? "common.retry"));
      return;
    }
    setPeople((rows) => rows?.map((row) => (row.id === person.id ? { ...row, invited: true } : row)) ?? rows);
    toast.success(t("invitedName", { name: person.name.split(" ")[0] }));
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/zeri/${roomId}`);
      toast.success(t("linkCopied"));
    } catch {
      toast.error(tAll("common.retry"));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          setPeople(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" data-voice-invite>
          <UserPlus />
          {t("invite")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-voice-invite-dialog>
        <DialogHeader>
          <DialogTitle>{t("inviteTitle")}</DialogTitle>
          <DialogDescription>{t(grantsEntry ? "inviteBodyHost" : "inviteBody")}</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-3">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("inviteSearch")}
            aria-label={t("inviteSearch")}
            icon={<Search />}
            data-voice-invite-search
          />

          <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto scrollbar-thin">
            {people === null
              ? Array.from({ length: 4 }, (_, index) => (
                  <li key={index} className="flex items-center gap-3 px-1 py-2">
                    <span className="size-9 animate-pulse rounded-full bg-surface-2" />
                    <span className="h-3 w-32 animate-pulse rounded-full bg-surface-2" />
                  </li>
                ))
              : people.map((person) => (
                  <li key={person.id} className="flex items-center gap-3 rounded-control px-1 py-1.5" data-invitee={person.username}>
                    <Avatar name={person.name} src={person.avatar} size="md" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-semibold text-text">{person.name}</span>
                      <span className="truncate text-xs text-text-muted">@{person.username}</span>
                    </span>
                    <Button
                      size="sm"
                      variant={person.invited ? "ghost" : "primary"}
                      disabled={person.invited}
                      loading={sending === person.id}
                      onClick={() => void invite(person)}
                    >
                      {person.invited ? <Check /> : null}
                      {t(person.invited ? "invitedShort" : "inviteOne")}
                    </Button>
                  </li>
                ))}
          </ul>

          {people !== null && people.length === 0 ? (
            <p className="rounded-control border border-dashed border-border p-4 text-center text-sm text-text-muted">
              {t(query ? "inviteNoMatch" : "inviteEmpty")}
            </p>
          ) : null}

          <Button variant="ghost" className="self-start" onClick={() => void copyLink()} data-voice-copy-link>
            <Link2 />
            {t("copyLink")}
          </Button>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
