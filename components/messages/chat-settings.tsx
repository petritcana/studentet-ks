"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Bell, BellOff, Download, FileText, Link2, MoreHorizontal, Play, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MediaImage } from "@/components/ui/media-image";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { SwitchRow } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { muteConversation, removeGroupMember, setGroupRole, updateGroupRules } from "@/lib/actions/chat-settings";
import { MUTE_CHOICES, isMutedForever, type MuteChoice } from "@/lib/chat-rules";
import { formatBytes } from "@/lib/media";
import { formatDateShort, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ChatMember = { id: string; name: string; username: string; avatar: string | null; role: string };

type Shared = {
  media: { id: string; kind: "image" | "video"; messageId: string }[];
  files: { id: string; name: string; extension: string; bytes: number; messageId: string; author: string; createdAt: string }[];
  links: { url: string; href: string; messageId: string; author: string; createdAt: string }[];
};

/**
 * Cilësimet e bisedës, në një fletë anash.
 *
 * Çdo anëtar: heshtja e njoftimeve për një kohë, dhe gjithçka që është ndarë
 * (fotot, skedarët, linqet). Te grupi: anëtarët me rolin, dhe për adminin
 * rregullat (vetëm adminët shkruajnë, linqet) dhe veprimet mbi anëtarët.
 */
export function ChatSettings({
  open,
  onOpenChange,
  conversationId,
  title,
  person,
  group,
  me,
  myRole,
  mutedUntil,
  rules,
  members,
  groupActions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  title: string;
  /** Te biseda me dy veta, personi tjetër. */
  person: { name: string; username: string; avatar: string | null } | null;
  group: boolean;
  me: { id: string; name: string; username: string; avatar: string | null };
  myRole: string;
  mutedUntil: string | null;
  rules: { adminsOnly: boolean; allowLinks: boolean };
  members: ChatMember[];
  groupActions?: React.ReactNode;
}) {
  const t = useTranslations("chatSettings");
  const tAll = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [shared, setShared] = React.useState<Shared | null>(null);
  const admin = group && myRole === "admin";
  // Heshtja shfaqet menjëherë pas prekjes; rifreskimi i faqes vjen pas.
  const [muted, setMuted] = React.useState(mutedUntil);
  React.useEffect(() => setMuted(mutedUntil), [mutedUntil]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setShared(null);
    void fetch(`/api/mesazhe/${conversationId}/te-ndara`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { media: [], files: [], links: [] }))
      .then((data: Shared) => {
        if (!cancelled) setShared(data);
      })
      .catch(() => {
        if (!cancelled) setShared({ media: [], files: [], links: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [open, conversationId]);

  function run(action: () => Promise<{ ok: boolean; messageKey?: string }>, success?: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(tAll(result.messageKey ?? "common.retry"));
        return;
      }
      if (success) toast.success(success);
      router.refresh();
    });
  }

  const everyone: ChatMember[] = [{ ...me, role: myRole }, ...members];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md" data-chat-settings>
        <SheetHeader className="items-center text-center">
          {person ? <Avatar name={person.name} src={person.avatar} size="lg" /> : null}
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {group ? t("membersCount", { count: everyone.length }) : person ? `@${person.username}` : ""}
          </SheetDescription>
          {person ? (
            <Button asChild size="sm" variant="secondary">
              <Link href={`/u/${person.username}`}>{t("viewProfile")}</Link>
            </Button>
          ) : null}
        </SheetHeader>

        <SheetBody className="flex flex-col gap-6">
          <MuteSection
            mutedUntil={muted}
            locale={locale}
            pending={pending}
            onChoose={(choice) =>
              run(async () => {
                const result = await muteConversation(conversationId, choice);
                if (result.ok) setMuted(result.mutedUntil ?? null);
                return result;
              }, choice === null ? t("unmuted") : t("mutedToast"))
            }
          />

          {group ? (
            <section className="flex flex-col gap-2" data-group-rules>
              <h3 className="text-sm font-semibold text-text">{t("rulesTitle")}</h3>
              {!admin ? <p className="text-xs text-text-muted">{t("rulesOnlyAdmin")}</p> : null}
              <SwitchRow
                id="chat-admins-only"
                label={t("adminsOnly")}
                description={t("adminsOnlyHint")}
                checked={rules.adminsOnly}
                disabled={!admin || pending}
                onCheckedChange={(value) => run(() => updateGroupRules(conversationId, { adminsOnly: value }))}
                data-rule="admins-only"
              />
              <SwitchRow
                id="chat-allow-links"
                label={t("allowLinks")}
                description={t("allowLinksHint")}
                checked={rules.allowLinks}
                disabled={!admin || pending}
                onCheckedChange={(value) => run(() => updateGroupRules(conversationId, { allowLinks: value }))}
                data-rule="allow-links"
              />
              <p className="text-xs text-text-muted">{t("callsRule")}</p>
            </section>
          ) : null}

          {group ? (
            <section className="flex flex-col gap-2" data-group-members>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-text">{t("members")}</h3>
                <span className="flex items-center gap-1">{groupActions}</span>
              </div>
              <ul className="flex flex-col gap-1">
                {everyone.map((member) => (
                  <li key={member.id} className="flex items-center gap-3 rounded-control px-2 py-1.5 hover:bg-surface-2" data-member={member.username}>
                    <Avatar name={member.name} src={member.avatar} size="sm" />
                    <Link href={`/u/${member.username}`} className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-text">
                        {member.id === me.id ? t("youName", { name: member.name }) : member.name}
                      </span>
                      <span className="truncate text-xs text-text-muted">@{member.username}</span>
                    </Link>
                    {member.role === "admin" ? (
                      <Badge variant="brand" className="gap-1">
                        <ShieldCheck className="size-3" />
                        {t("admin")}
                      </Badge>
                    ) : null}
                    {admin && member.id !== me.id ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="iconSm" aria-label={t("memberActions", { name: member.name })} data-member-menu>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.role === "admin" ? (
                            <DropdownMenuItem onSelect={() => run(() => setGroupRole(conversationId, member.id, "member"))}>
                              {t("removeAdmin")}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onSelect={() => run(() => setGroupRole(conversationId, member.id, "admin"))} data-make-admin>
                              {t("makeAdmin")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            destructive
                            onSelect={() => run(() => removeGroupMember(conversationId, member.id), t("removed", { name: member.name }))}
                            data-remove-member
                          >
                            {t("removeMember")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="flex flex-col gap-2" data-shared>
            <h3 className="text-sm font-semibold text-text">{t("sharedTitle")}</h3>
            <Tabs defaultValue="media">
              <TabsList className="w-full">
                <TabsTrigger value="media" className="flex-1">
                  {t("tabMedia")}
                </TabsTrigger>
                <TabsTrigger value="files" className="flex-1">
                  {t("tabFiles")}
                </TabsTrigger>
                <TabsTrigger value="links" className="flex-1">
                  {t("tabLinks")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="media" className="pt-3">
                {shared === null ? (
                  <SharedSkeleton label={t("loading")} grid />
                ) : shared.media.length === 0 ? (
                  <SharedEmpty text={t("emptyMedia")} />
                ) : (
                  <ul className="grid grid-cols-3 gap-1.5" data-shared-media>
                    {shared.media.map((item) => (
                      <li key={item.id} className="relative aspect-square overflow-hidden rounded-[10px] bg-surface-2">
                        <a href={`/api/media/${item.id}`} target="_blank" rel="noreferrer" className="block size-full">
                          {item.kind === "image" ? (
                            <MediaImage src={`/api/media/${item.id}`} alt="" width={160} height={160} className="size-full object-cover" />
                          ) : (
                            <>
                              <video src={`/api/media/${item.id}`} muted preload="metadata" className="size-full object-cover" />
                              <Play className="absolute inset-0 m-auto size-6 fill-current text-white drop-shadow" aria-hidden />
                            </>
                          )}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="files" className="pt-3">
                {shared === null ? (
                  <SharedSkeleton label={t("loading")} />
                ) : shared.files.length === 0 ? (
                  <SharedEmpty text={t("emptyFiles")} />
                ) : (
                  <ul className="flex flex-col gap-1.5" data-shared-files>
                    {shared.files.map((file) => (
                      <li key={file.id}>
                        <a
                          href={`/api/media/${file.id}`}
                          download={file.name}
                          className="flex items-center gap-3 rounded-control border border-border px-3 py-2 transition-colors hover:bg-surface-2"
                        >
                          <FileText className="size-6 shrink-0 text-brand-500" aria-hidden />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm font-medium text-text">{file.name}</span>
                            <span className="truncate text-[11px] text-text-muted">
                              {file.extension.toUpperCase()} · {formatBytes(file.bytes)} · {file.author} · {formatDateShort(file.createdAt, locale)}
                            </span>
                          </span>
                          <Download className="size-4 shrink-0 text-text-muted" aria-hidden />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="links" className="pt-3">
                {shared === null ? (
                  <SharedSkeleton label={t("loading")} />
                ) : shared.links.length === 0 ? (
                  <SharedEmpty text={t("emptyLinks")} />
                ) : (
                  <ul className="flex flex-col gap-1.5" data-shared-links>
                    {shared.links.map((link, index) => (
                      <li key={`${link.messageId}-${index}`}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-center gap-3 rounded-control border border-border px-3 py-2 transition-colors hover:bg-surface-2"
                        >
                          <Link2 className="size-5 shrink-0 text-brand-500" aria-hidden />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm font-medium text-brand-500">{link.url}</span>
                            <span className="truncate text-[11px] text-text-muted">
                              {link.author} · {formatDateShort(link.createdAt, locale)}
                            </span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </section>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );

  function MuteSection({
    mutedUntil,
    locale,
    pending,
    onChoose,
  }: {
    mutedUntil: string | null;
    locale: string;
    pending: boolean;
    onChoose: (choice: MuteChoice | null) => void;
  }) {
    const muted = Boolean(mutedUntil);
    return (
      <section className="flex flex-col gap-2" data-mute>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text">
          {muted ? <BellOff className="size-4 text-text-muted" /> : <Bell className="size-4 text-brand-500" />}
          {t("notifications")}
        </h3>
        {muted ? (
          <div className="flex items-center justify-between gap-3 rounded-control border border-border bg-surface p-3">
            <span className="text-sm text-text" data-muted-until>
              {isMutedForever(mutedUntil) ? t("mutedForever") : t("mutedUntil", { date: formatDateTime(mutedUntil!, locale) })}
            </span>
            <Button size="sm" onClick={() => onChoose(null)} disabled={pending} data-unmute>
              {t("unmute")}
            </Button>
          </div>
        ) : (
          <>
            <p className="text-xs text-text-muted">{t("muteHint")}</p>
            <div className="flex flex-wrap gap-2">
              {MUTE_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  disabled={pending}
                  onClick={() => onChoose(choice)}
                  className={cn(
                    "rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text transition-colors",
                    "hover:border-brand-500/60 hover:bg-brand-50 disabled:opacity-50",
                  )}
                  data-mute-choice={choice}
                >
                  {t(`mute_${choice}`)}
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    );
  }
}

function SharedSkeleton({ label, grid = false }: { label: string; grid?: boolean }) {
  return (
    <div role="status" aria-label={label} className={grid ? "grid grid-cols-3 gap-1.5" : "flex flex-col gap-1.5"}>
      {Array.from({ length: grid ? 6 : 3 }).map((_, index) => (
        <Skeleton key={index} className={grid ? "aspect-square rounded-[10px]" : "h-12 rounded-control"} />
      ))}
    </div>
  );
}

function SharedEmpty({ text }: { text: string }) {
  return <p className="rounded-control border border-dashed border-border px-3 py-6 text-center text-xs text-text-muted">{text}</p>;
}
