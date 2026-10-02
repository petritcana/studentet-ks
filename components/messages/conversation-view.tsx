"use client";

import { useReviewGuard } from "@/components/layout/review-state";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, BellOff, Info, Lock, MessageCircleQuestion, Phone, Search, Send, Video, X } from "lucide-react";
import { AvatarStack } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { UserIdentityLine } from "@/components/identity/user-identity-line";
import { PresenceDot } from "@/components/social/presence-dot";
import type { PresenceStatus } from "@/lib/presence";
import { Input } from "@/components/ui/input";
import { MediaPicker, type MediaPickerHandle } from "@/components/feed/media-picker";
import { CameraCapture, openDeviceCamera, prefersDeviceCamera } from "@/components/feed/camera-capture";
import { AttachMenu } from "./attach-menu";
import { useCalls } from "./call-provider";
import { ChatSettings, type ChatMember } from "./chat-settings";
import { DaySeparator, MessageBubble, type MessageDto } from "./message-bubble";
import { VoiceRecorder } from "./voice-recorder";
import {
  acceptConversation,
  deleteMessage,
  editMessage,
  markConversationRead,
  reactToMessage,
  sendMessage,
  setTyping as markTyping,
} from "@/lib/actions/messages";
import { containsLink } from "@/lib/chat-rules";
import type { MediaRef } from "@/lib/media";
import type { PublicAuthor } from "@/lib/dto";
import { cn } from "@/lib/utils";

export type { MessageDto } from "./message-bubble";

type ActiveCall = { id: string; video: boolean; count: number; joined: boolean } | null;
type Rules = { adminsOnly: boolean; allowLinks: boolean };
type MemberRole = { id: string; role: string };

export function ConversationView({
  conversationId,
  me,
  other,
  group,
  groupActions,
  messages: initialMessages,
  isAccepted,
  presence,
  typing: initialTyping = [],
  onlineCount: initialOnline = 1,
  today,
  myRole: initialRole,
  mutedUntil: initialMuted,
  rules: initialRules,
  memberRoles: initialRoles,
  activeCall: initialCall,
}: {
  conversationId: string;
  me: { id: string; name: string; username: string; avatar: string | null };
  other: PublicAuthor | null;
  group: { title: string; members: PublicAuthor[] } | null;
  groupActions?: React.ReactNode;
  messages: MessageDto[];
  isAccepted: boolean;
  /**
   * `null` kur tjetri e ka fikur statusin. Atehere koka nuk thote asgjë.
   *
   * Etiketa e kohes vjen e gatshme nga serveri: e llogaritur këtu, ajo do te
   * ndryshonte mes renderit dhe hidratimit dhe do te prishte hidratimin.
   */
  presence: { status: PresenceStatus; lastSeenLabel: string | null } | null;
  /** Emrat e atyre që po shkruajnë tani. Vjen i freskët me çdo rifreskim. */
  typing?: string[];
  /** Sa anëtarë janë aktivë tani, vetëm ata që e lejojnë (në grup). */
  onlineCount?: number;
  /** Dita e sotme nga serveri, për mesazhet që dërgohen para rifreskimit. */
  today: { key: string; label: string };
  myRole: string;
  mutedUntil: string | null;
  rules: Rules;
  memberRoles: MemberRole[];
  activeCall: ActiveCall;
}) {
  const router = useRouter();
  const t = useTranslations("messages");
  const tcall = useTranslations("calls");
  const tp = useTranslations("presence");
  const tc = useTranslations("common");
  const guard = useTranslations("guard");
  const errors = useTranslations("errors");

  /*
    Biseda merr frymë vetë.

    Serveri e kthen gjendjen e plotë çdo pak sekonda, dhe komponenti e zëvendëson
    listën me të. Kjo e mban të thjeshtë: asnjë bashkim i pjesshëm, asnjë rend i
    prishur, dhe reagimet, leximet, rregullat dhe thirrja vijnë bashkë me mesazhet.

    Rrahja ndalon kur skeda nuk shihet: askush nuk përfiton nga kërkesa që askush
    nuk i lexon, dhe bateria e telefonit as aq.
  */
  const [messages, setMessages] = React.useState(initialMessages);
  const [typing, setTyping] = React.useState(initialTyping);
  const [online, setOnline] = React.useState(initialOnline);
  const [myRole, setMyRole] = React.useState(initialRole);
  const [mutedUntil, setMutedUntil] = React.useState(initialMuted);
  const [rules, setRules] = React.useState(initialRules);
  const [roles, setRoles] = React.useState(initialRoles);
  const [activeCall, setActiveCall] = React.useState<ActiveCall>(initialCall);
  const calls = useCalls();
  // Jam në një thirrje, këtu ose në një bisedë tjetër: butonat e thirrjes presin.
  const inCall = calls.active;
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const pickerRef = React.useRef<MediaPickerHandle>(null);
  const [camera, setCamera] = React.useState(false);

  React.useEffect(() => setMessages(initialMessages), [initialMessages]);
  React.useEffect(() => setMyRole(initialRole), [initialRole]);
  React.useEffect(() => setMutedUntil(initialMuted), [initialMuted]);
  React.useEffect(() => setRules(initialRules), [initialRules]);
  React.useEffect(() => setRoles(initialRoles), [initialRoles]);
  React.useEffect(() => setActiveCall(initialCall), [initialCall]);

  React.useEffect(() => {
    let stopped = false;

    async function pull() {
      if (document.visibilityState !== "visible") return;

      try {
        const response = await fetch(`/api/mesazhe/${conversationId}`, { cache: "no-store" });
        if (!response.ok || stopped) return;

        const data = (await response.json()) as {
          messages: MessageDto[];
          typing: string[];
          onlineCount?: number;
          activeCall?: ActiveCall;
          rules?: Rules;
          myRole?: string;
          memberRoles?: MemberRole[];
          mutedUntil?: string | null;
        };
        setMessages(data.messages);
        setTyping(data.typing);
        if (typeof data.onlineCount === "number") setOnline(data.onlineCount);
        if (data.activeCall !== undefined) setActiveCall(data.activeCall);
        if (data.rules) setRules(data.rules);
        if (data.myRole) setMyRole(data.myRole);
        if (data.memberRoles) setRoles(data.memberRoles);
        if (data.mutedUntil !== undefined) setMutedUntil(data.mutedUntil);
        // Çfarë erdhi nga serveri e zëvendëson atë që u shtua me optimizëm.
        setSent([]);
      } catch {
        // Një rrahje e humbur nuk ka pse të shqetësojë askënd: vjen e tjetra.
      }
    }

    const timer = window.setInterval(pull, 3500);
    document.addEventListener("visibilitychange", pull);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", pull);
    };
  }, [conversationId]);

  const [text, setText] = React.useState("");
  const [media, setMedia] = React.useState<MediaRef[]>([]);
  const [replyTo, setReplyTo] = React.useState<MessageDto | null>(null);
  const [editing, setEditing] = React.useState<MessageDto | null>(null);
  const [query, setQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [accepted, setAccepted] = React.useState(isAccepted);
  const [pending, startTransition] = React.useTransition();
  const blocked = useReviewGuard();
  const endRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  // Mesazhet e dërguara nga kjo skedë, derisa serveri t'i kthejë vetë.
  const [sent, setSent] = React.useState<MessageDto[]>([]);
  const [recording, setRecording] = React.useState(false);
  const shown = sent.length > 0 ? [...messages, ...sent] : messages;

  const isAdmin = Boolean(group) && myRole === "admin";
  // Grupi i ndalur: shkruajnë vetëm adminët. Të tjerët e shohin arsyen në vend të fushës.
  const locked = Boolean(group) && rules.adminsOnly && !isAdmin;
  // Thirrjen te grupi e nis vetëm admini; te biseda me dy veta kushdo.
  const canStartCall = accepted && (!group || isAdmin);

  // Kërkimi filtron brenda bisedës së hapur: pa kërkesë të re te serveri.
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? shown.filter((message) => message.kind !== "call" && message.text.toLowerCase().includes(needle))
    : shown;

  React.useEffect(() => {
    setSent([]);
  }, [messages.length]);

  /*
    Shenja «po shkruan».

    Dërgohet e rrallë, jo me çdo shkronjë: një kërkesë për tastier do të ishte
    bujari ndaj serverit pa asnjë përfitim për studentin. Afati te baza është i
    shkurtër, prandaj shenja shuhet vetë kur dikush ndalet.
  */
  const lastTyping = React.useRef(0);
  function noteTyping() {
    const now = Date.now();
    if (now - lastTyping.current < 3000) return;
    lastTyping.current = now;
    void markTyping(conversationId);
  }

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
    void markConversationRead(conversationId);
  }, [conversationId, shown.length]);

  // Balona «po shkruan» del në fund; rrëshqit te ajo vetëm kur studenti është afër fundit.
  React.useEffect(() => {
    const end = endRef.current;
    const list = end?.parentElement;
    if (!end || !list || typing.length === 0) return;
    if (list.scrollHeight - list.scrollTop - list.clientHeight < 160) end.scrollIntoView({ block: "end" });
  }, [typing.length]);

  /** Gabimet e serverit vijnë si çelësa; këtu kthehen në fjali. */
  function explain(key: string) {
    return key.startsWith("guard.")
      ? guard(key.replace("guard.", ""))
      : key.startsWith("errors.")
        ? errors(key.replace("errors.", ""))
        : tc("retry");
  }

  function send() {
    const value = text.trim();
    if (value.length < 1 && media.length === 0) return;
    if (blocked()) return;

    // Rregulli i grupit thuhet menjëherë, pa pritur serverin (i cili e kontrollon prapë).
    if (group && !isAdmin && !rules.allowLinks && containsLink(value)) {
      toast.error(errors("chatNoLinks"));
      return;
    }

    if (editing) {
      const target = editing;
      startTransition(async () => {
        const result = await editMessage(target.id, value);
        if (!result.ok) {
          toast.error(explain(result.messageKey ?? ""));
          return;
        }
        setEditing(null);
        setText("");
        router.refresh();
      });
      return;
    }

    startTransition(async () => {
      const result = await sendMessage(conversationId, value, {
        media,
        replyToId: replyTo?.id ?? null,
      });
      if (!result.ok) {
        toast.error(explain(result.messageKey ?? ""));
        return;
      }
      setText("");
      setMedia([]);
      setReplyTo(null);
      setSent((current) => [
        ...current,
        {
          id: `sent-${current.length}-${value.length}`,
          text: value,
          media: [],
          kind: "text",
          edited: false,
          deleted: false,
          createdAt: new Date().toISOString(),
          mine: true,
          seen: false,
          seenCount: 0,
          delivered: false,
          day: today.key,
          dayLabel: today.label,
          replyTo: null,
          reactions: {},
          myReaction: null,
          story: null,
          author: null,
        },
      ]);
      router.refresh();
    });
  }

  /** Zëri shkon si mesazh më vete, me përgjigjen e hapur nëse kishte një. */
  async function sendVoice(voice: MediaRef) {
    if (blocked()) return false;
    const result = await sendMessage(conversationId, "", {
      media: [voice],
      kind: "voice",
      replyToId: replyTo?.id ?? null,
    });
    if (!result.ok) {
      toast.error(explain(result.messageKey ?? ""));
      return false;
    }
    setReplyTo(null);
    router.refresh();
    return true;
  }

  function react(message: MessageDto, emoji: string) {
    // Reagimi shfaqet menjëherë; rrahja e radhës e sjell gjendjen e serverit.
    setMessages((current) =>
      current.map((item) => {
        if (item.id !== message.id) return item;
        const reactions = { ...item.reactions };
        if (item.myReaction) reactions[item.myReaction] = Math.max(0, (reactions[item.myReaction] ?? 1) - 1);
        const removing = item.myReaction === emoji;
        if (!removing) reactions[emoji] = (reactions[emoji] ?? 0) + 1;
        return { ...item, reactions, myReaction: removing ? null : emoji };
      }),
    );
    startTransition(async () => {
      await reactToMessage(message.id, emoji);
      router.refresh();
    });
  }

  function remove(message: MessageDto) {
    startTransition(async () => {
      const result = await deleteMessage(message.id);
      if (!result.ok) {
        toast.error(explain(result.messageKey ?? ""));
        return;
      }
      router.refresh();
    });
  }

  /** Prekja e citimit të çon te mesazhi origjinal dhe e ndriçon për një çast. */
  function jumpTo(id: string) {
    const node = document.getElementById(`msg-${id}`);
    if (!node) {
      toast.info(t("quoteNotLoaded"));
      return;
    }
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    const bubble = node.querySelector("[data-bubble]");
    bubble?.classList.add("ring-2", "ring-brand-500");
    window.setTimeout(() => bubble?.classList.remove("ring-2", "ring-brand-500"), 1400);
  }

  function reply(item: MessageDto) {
    setEditing(null);
    setReplyTo(item);
    inputRef.current?.focus();
  }

  function accept() {
    startTransition(async () => {
      await acceptConversation(conversationId);
      setAccepted(true);
      toast.success(t("accepted"));
      router.refresh();
    });
  }

  /** «Bëj foto»: në telefon kamera e pajisjes drejt, në kompjuter kamera e laptopit. */
  function openCamera() {
    if (prefersDeviceCamera()) openDeviceCamera((file) => void pickerRef.current?.addFiles([file]));
    else setCamera(true);
  }

  function call(video: boolean) {
    startTransition(async () => {
      const error = await calls.start(conversationId, video, title);
      if (error) toast.error(explain(error));
      router.refresh();
    });
  }

  function join(callId: string) {
    const video = activeCall?.id === callId ? activeCall.video : false;
    startTransition(async () => {
      const error = await calls.join(callId, video, title, conversationId);
      if (error) {
        toast.error(explain(error));
        router.refresh();
      }
    });
  }

  function typingLabel(names: string[]) {
    const first = (name: string) => name.split(" ")[0];
    if (!group || names.length === 1) return t("typingOne", { name: group ? first(names[0]) : names[0] });
    if (names.length === 2) return t("typingTwo", { first: first(names[0]), second: first(names[1]) });
    return t("typingMany", { first: first(names[0]), count: names.length - 1 });
  }

  const title = group ? group.title : (other?.name ?? "");
  const members: ChatMember[] = (group?.members ?? []).map((member) => ({
    id: member.id,
    name: member.name,
    username: member.username,
    avatar: member.avatar,
    role: roles.find((row) => row.id === member.id)?.role ?? "member",
  }));
  const empty = !text.trim() && media.length === 0;

  return (
    <div className="flex h-[calc(100dvh-12rem)] flex-col gap-3 lg:glass lg:h-[calc(100dvh-9rem)] lg:rounded-card lg:p-4">
      <header className="flex items-center gap-2 border-b border-border pb-3">
        <Button asChild variant="ghost" size="iconSm" aria-label={t("backToList")}>
          <Link href="/mesazhe">
            <ArrowLeft />
          </Link>
        </Button>
        {other ? (
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <UserIdentityLine user={other} size="sm" />
            {presence ? (
              presence.status !== "offline" ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-text-muted">
                  <PresenceDot status={presence.status} />
                  {tp(presence.status)}
                </span>
              ) : presence.lastSeenLabel ? (
                <span className="text-[11px] text-text-muted">{presence.lastSeenLabel}</span>
              ) : null
            ) : null}
          </div>
        ) : null}

        {group ? (
          <>
            <AvatarStack people={group.members} max={3} size="sm" />
            <button type="button" onClick={() => setSettingsOpen(true)} className="flex min-w-0 flex-1 flex-col text-left">
              <span className="truncate text-sm font-semibold text-text">{group.title}</span>
              <span className="truncate text-[11px] text-text-muted" title={group.members.map((member) => member.name).join(", ")}>
                {online > 1
                  ? t("membersOnline", { count: group.members.length + 1, online })
                  : t("members", { count: group.members.length + 1 })}
              </span>
            </button>
          </>
        ) : null}

        {mutedUntil ? <BellOff className="size-4 shrink-0 text-text-muted" aria-label={t("mutedBadge")} data-muted-icon /> : null}

        {canStartCall ? (
          <>
            <Button variant="ghost" size="iconSm" aria-label={tcall("startAudio")} title={tcall("startAudio")} onClick={() => call(false)} disabled={pending || Boolean(inCall)} data-call-start="audio">
              <Phone />
            </Button>
            <Button variant="ghost" size="iconSm" aria-label={tcall("startVideo")} title={tcall("startVideo")} onClick={() => call(true)} disabled={pending || Boolean(inCall)} data-call-start="video">
              <Video />
            </Button>
          </>
        ) : null}
        <Button
          variant="ghost"
          size="iconSm"
          aria-label={t("search")}
          onClick={() => {
            setSearching((value) => !value);
            setQuery("");
          }}
        >
          {searching ? <X /> : <Search />}
        </Button>
        <Button variant="ghost" size="iconSm" aria-label={t("chatSettings")} title={t("chatSettings")} onClick={() => setSettingsOpen(true)} data-chat-settings-open>
          <Info />
        </Button>
      </header>

      {/* Thirrja e gjallë: kush s'është brenda vendos vetë nëse hyn. */}
      {activeCall && !activeCall.joined && !inCall ? (
        <div className="flex items-center gap-3 rounded-control border border-success/40 bg-success/10 px-3 py-2" role="status" data-call-banner>
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-success/20 text-success-text">
            {activeCall.video ? <Video className="size-4" /> : <Phone className="size-4" />}
          </span>
          <span className="min-w-0 flex-1 text-sm text-text">
            {activeCall.video ? tcall("liveVideo", { count: activeCall.count }) : tcall("liveAudio", { count: activeCall.count })}
          </span>
          <Button size="sm" onClick={() => join(activeCall.id)} loading={pending} data-call-join>
            {tcall("join")}
          </Button>
        </div>
      ) : null}

      {searching ? (
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("search")}
          icon={<Search />}
        />
      ) : null}

      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden scrollbar-thin px-1 pb-2" data-message-list>
        {visible.length === 0 ? (
          query ? (
            <p className="py-8 text-center text-sm text-text-muted">{t("noMatches")}</p>
          ) : (
            <div className="m-auto flex max-w-sm flex-col items-center gap-3 py-10 text-center" data-chat-start>
              <span className="grid size-14 place-items-center rounded-full bg-brand-50 text-brand-500" aria-hidden>
                <MessageCircleQuestion className="size-7" />
              </span>
              <p className="text-base font-semibold text-text">{t("startTitle")}</p>
              <p className="text-sm text-text-muted">{t("startBody")}</p>
            </div>
          )
        ) : (
          visible.map((message, index) => {
            const previous = visible[index - 1];
            const next = visible[index + 1];
            const newDay = !previous || previous.day !== message.day;
            const startsGroup = newDay || !sameRun(previous, message);
            const endsGroup = !next || next.day !== message.day || !sameRun(message, next);
            return (
              <React.Fragment key={message.id}>
                {newDay ? <DaySeparator label={message.dayLabel} /> : null}
                <MessageBubble
                  message={message}
                  inGroup={Boolean(group)}
                  startsGroup={startsGroup}
                  endsGroup={endsGroup}
                  onReply={reply}
                  onEdit={(item) => {
                    setReplyTo(null);
                    setEditing(item);
                    setText(item.text);
                    inputRef.current?.focus();
                  }}
                  onDelete={remove}
                  onReact={react}
                  onJump={jumpTo}
                  onJoinCall={inCall ? undefined : join}
                />
              </React.Fragment>
            );
          })
        )}

        {typing.length > 0 ? <TypingBubble label={typingLabel(typing)} /> : null}

        <div ref={endRef} />
      </div>

      {!accepted ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <p className="measure min-w-0 flex-1 text-sm text-text-muted">{t("subtitle")}</p>
          <Button onClick={accept} loading={pending}>
            {t("accept")}
          </Button>
        </div>
      ) : locked ? (
        <div className="flex items-center justify-center gap-2 border-t border-border pt-3 text-sm text-text-muted" data-chat-locked>
          <Lock className="size-4" aria-hidden />
          {t("lockedByAdmin")}
        </div>
      ) : (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          {replyTo || editing ? (
            <div className="flex items-center gap-2 rounded-md border-l-2 border-brand-500 bg-surface-2 px-2 py-1.5">
              <span className="flex min-w-0 flex-1 flex-col text-[11px]">
                <span className="font-medium text-text">
                  {editing ? tc("edit") : t("replyingTo", { name: replyTo?.author?.name ?? t("someone") })}
                </span>
                <span className="truncate text-text-muted">{(editing ?? replyTo)?.text}</span>
              </span>
              <Button
                variant="ghost"
                size="iconSm"
                aria-label={tc("cancel")}
                onClick={() => {
                  setReplyTo(null);
                  setEditing(null);
                  if (editing) setText("");
                }}
              >
                <X />
              </Button>
            </div>
          ) : null}

          {!editing ? (
            <MediaPicker ref={pickerRef} media={media} onChange={setMedia} max={4} surface="message" documents hideAddButton />
          ) : null}
          <CameraCapture open={camera} onOpenChange={setCamera} onCapture={(file) => void pickerRef.current?.addFiles([file])} />

          {/*
            Një drejtkëndësh i vetëm: «+» majtas në mes, teksti, dhe djathtas
            mikrofoni kur fusha është bosh ose dërgimi kur ka diçka për të dërguar.
            Gjatë regjistrimit të zërit, shiriti i tij zë tërë vendin.
          */}
          <div
            className={cn(
              "flex min-h-11 items-center gap-1",
              !recording &&
                "rounded-[22px] border border-border bg-surface-2 px-1.5 transition-colors duration-150 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/25",
            )}
            data-composer-field
          >
            {!recording && !editing ? (
              <AttachMenu
                onMedia={() => pickerRef.current?.openFiles()}
                onCamera={openCamera}
                onFile={() => pickerRef.current?.openDocuments()}
                disabled={pending}
              />
            ) : null}
            {!recording ? (
              <Textarea
                ref={inputRef}
                autoGrow
                maxRows={5}
                value={text}
                maxLength={2000}
                onChange={(event) => {
                  setText(event.target.value);
                  noteTyping();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                placeholder={t("placeholder")}
                aria-label={t("placeholder")}
                rows={1}
                className={cn(
                  "min-h-10 min-w-0 flex-1 border-0 bg-transparent px-1.5 py-2.5 leading-5 hover:border-0 focus:ring-0",
                  editing && "pl-3",
                )}
              />
            ) : null}
            {!editing ? (
              <VoiceRecorder
                onSend={sendVoice}
                onRecordingChange={setRecording}
                disabled={pending}
                showButton={empty}
                buttonClassName="size-9 rounded-full"
              />
            ) : null}
            {recording || (!editing && empty) ? null : (
              <Button
                size="icon"
                onClick={send}
                loading={pending}
                disabled={empty}
                aria-label={t("sendLabel")}
                className="size-9 shrink-0 animate-rise rounded-full"
              >
                <Send />
              </Button>
            )}
          </div>
        </div>
      )}

      <ChatSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        conversationId={conversationId}
        title={title}
        person={other ? { name: other.name, username: other.username, avatar: other.avatar } : null}
        group={Boolean(group)}
        me={me}
        myRole={myRole}
        mutedUntil={mutedUntil}
        rules={rules}
        members={members}
        groupActions={groupActions}
      />

    </div>
  );
}

/** Dy mesazhe i përkasin të njëjtit grup kur i shkruan i njëjti, brenda pesë minutave. */
function sameRun(a: MessageDto, b: MessageDto) {
  // Rreshti i thirrjes dhe mesazhi i fshirë rrinë më vete: ai para tyre e mban orën dhe gjendjen.
  if (a.kind === "call" || b.kind === "call" || a.deleted || b.deleted) return false;
  const author = (message: MessageDto) => (message.mine ? "me" : (message.author?.username ?? "?"));
  if (author(a) !== author(b)) return false;
  return Math.abs(new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) < 5 * 60_000;
}

/** «Po shkruan»: tri pika që lëvizin në një balonë, dhe emri poshtë. */
function TypingBubble({ label }: { label: string }) {
  return (
    <div className="mt-3 flex flex-col items-start gap-1 animate-bubble" role="status" aria-live="polite" data-typing>
      <span className="inline-flex items-center gap-1 rounded-[18px] rounded-bl-[5px] border border-border bg-surface-2 px-3.5 py-3" aria-hidden>
        {[0, 1, 2].map((index) => (
          <span key={index} className="size-1.5 rounded-full bg-text-muted animate-typing" style={{ animationDelay: `${index * 160}ms` }} />
        ))}
      </span>
      <span className="px-1 text-[11px] text-text-muted">{label}</span>
    </div>
  );
}
