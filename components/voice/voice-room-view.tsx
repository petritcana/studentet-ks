"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Hand, LogOut, Mic, MicOff, MoreHorizontal, Send, Square, Volume2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MediaImage } from "@/components/ui/media-image";
import { toast } from "@/components/ui/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VerifiedMark } from "@/components/identity/verified-mark";
import { CameraCapture, openDeviceCamera, prefersDeviceCamera } from "@/components/feed/camera-capture";
import { MediaPicker, type MediaPickerHandle } from "@/components/feed/media-picker";
import { AttachMenu } from "@/components/messages/attach-menu";
import { FileCard } from "@/components/messages/message-bubble";
import {
  endVoiceRoom,
  heartbeatVoiceRoom,
  leaveVoiceRoom,
  moderateParticipant,
  raiseHand,
  sendVoiceMessage,
  setMuted,
} from "@/lib/actions/voice";
import type { MediaRef } from "@/lib/media";
import { canSpeak, PARTICIPANT_TIMEOUT_SECONDS, type VoiceRole } from "@/lib/voice";
import { cn } from "@/lib/utils";
import { useVoiceMesh } from "./use-voice-mesh";
import { VoiceInviteDialog } from "./voice-invite-dialog";

export type RoomParticipant = {
  role: string;
  isMuted: boolean;
  handRaised: boolean;
  user: { id: string; name: string; username: string; avatar: string | null; isVerified: boolean };
};

export type RoomMessage = {
  id: string;
  text: string;
  media: MediaRef[];
  user: { name: string; username: string; avatar: string | null };
};

type ModerationAction = "mute" | "remove" | "promote" | "demote";

export function VoiceRoomView({
  roomId,
  title,
  description,
  isHost,
  meId,
  myRole: initialRole,
  participants: initialParticipants,
  messages: initialMessages,
}: {
  roomId: string;
  title: string;
  description: string | null;
  isHost: boolean;
  meId: string;
  myRole: VoiceRole;
  participants: RoomParticipant[];
  messages: RoomMessage[];
}) {
  const router = useRouter();
  const t = useTranslations("voice");
  const tc = useTranslations("common");
  const tAll = useTranslations();

  const [participants, setParticipants] = React.useState(initialParticipants);
  const [messages, setMessages] = React.useState(initialMessages);
  const [hand, setHand] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [media, setMedia] = React.useState<MediaRef[]>([]);
  const [camera, setCamera] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const endRef = React.useRef<HTMLDivElement>(null);
  const pickerRef = React.useRef<MediaPickerHandle>(null);

  // Roli dhe heshtja ime vijnë nga serveri: pritësi mund të më bëjë folës ose të më heshtë.
  const mine = participants.find((item) => item.user.id === meId);
  const role = (mine?.role ?? initialRole) as VoiceRole;
  const talks = canSpeak(role);
  const [muted, setMutedState] = React.useState(mine?.isMuted ?? !talks);
  const toggledAtRef = React.useRef(0);
  const serverMuted = mine?.isMuted;
  React.useEffect(() => {
    // Ndryshimi im i fundit fiton për pak sekonda, derisa serveri ta ketë parë.
    if (serverMuted === undefined || Date.now() - toggledAtRef.current < 6000) return;
    setMutedState(serverMuted);
  }, [serverMuted]);

  const peerIds = participants.map((item) => item.user.id).filter((id) => id !== meId);
  const { speaking, needsGesture, resume, micError } = useVoiceMesh({
    roomId,
    meId,
    peerIds,
    canTalk: talks,
    muted: muted || !talks,
  });

  // Rrahja e mban vendin. Kur skeda mbyllet, rrahja ndalet dhe serveri e liron
  // vendin vetë pas afatit, prandaj numri i dëgjuesve mbetet i vërtetë.
  React.useEffect(() => {
    void heartbeatVoiceRoom(roomId);
    const timer = window.setInterval(
      () => void heartbeatVoiceRoom(roomId),
      (PARTICIPANT_TIMEOUT_SECONDS / 3) * 1000,
    );
    return () => window.clearInterval(timer);
  }, [roomId]);

  // Lista dhe biseda rifreskohen nga serveri. Kur pritësi më largon ose e mbyll
  // dhomën, faqja e thotë dhe më çon te ballina.
  React.useEffect(() => {
    let cancelled = false;

    async function pull() {
      const response = await fetch(`/api/zeri/${roomId}`, { cache: "no-store" }).catch(() => null);
      if (!response || cancelled) return;
      if (response.status === 410) {
        const data = (await response.json().catch(() => ({}))) as { removed?: boolean };
        toast(t(data.removed ? "youWereRemoved" : "roomEnded"));
        router.push("/feed");
        return;
      }
      if (!response.ok) return;
      const data = await response.json();
      setParticipants(data.participants ?? []);
      setMessages(data.messages ?? []);
    }

    const timer = window.setInterval(pull, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [roomId, router, t]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function toggleMute() {
    const next = !muted;
    toggledAtRef.current = Date.now();
    setMutedState(next);
    resume();
    void setMuted(roomId, next);
  }

  function toggleHand() {
    const next = !hand;
    setHand(next);
    void raiseHand(roomId, next);
  }

  function leave() {
    startTransition(async () => {
      await leaveVoiceRoom(roomId);
      router.push("/feed");
    });
  }

  function close() {
    startTransition(async () => {
      const result = await endVoiceRoom(roomId);
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      router.push("/feed");
    });
  }

  function moderate(targetUserId: string, action: ModerationAction) {
    startTransition(async () => {
      const result = await moderateParticipant({ roomId, targetUserId, action });
      if (!result.ok) {
        toast.error(tAll(result.messageKey ?? "common.retry"));
        return;
      }
      if (action === "remove") {
        setParticipants((current) => current.filter((item) => item.user.id !== targetUserId));
        toast.success(t("removed"));
      }
      router.refresh();
    });
  }

  function send() {
    const value = draft.trim();
    if (!value && media.length === 0) return;
    const attachments = media;
    setDraft("");
    setMedia([]);
    startTransition(async () => {
      const result = await sendVoiceMessage(roomId, value, attachments);
      if (!result.ok) {
        toast.error(tAll(result.messageKey ?? "common.retry"));
        return;
      }
      router.refresh();
    });
  }

  // Vendi im tregon heshtjen time menjëherë, pa pritur rifreskimin nga serveri.
  const seats = participants.map((item) => (item.user.id === meId && talks ? { ...item, isMuted: muted } : item));
  const speakers = seats.filter((item) => canSpeak(item.role as VoiceRole));
  const listeners = seats.filter((item) => !canSpeak(item.role as VoiceRole));
  const hands = participants.filter((item) => item.handRaised);
  const moderates = isHost || role === "moderator";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4" onPointerDown={needsGesture ? resume : undefined}>
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-text">{title}</h1>
        {description ? <p className="measure text-sm text-text-muted">{description}</p> : null}
        <p className="text-xs text-text-muted">{t("listeners", { count: participants.length })}</p>
      </header>

      {needsGesture ? (
        <button
          type="button"
          onClick={resume}
          className="flex items-center gap-2 rounded-control border border-brand-500/40 bg-brand-50 p-3 text-left text-sm font-semibold text-text"
          data-voice-resume
        >
          <Volume2 className="size-4 shrink-0 text-brand-500" aria-hidden />
          {t("tapToListen")}
        </button>
      ) : null}
      {micError && talks ? (
        <p className="rounded-control border border-danger/30 bg-danger-50 p-3 text-xs text-danger-text">{t("micDenied")}</p>
      ) : null}

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text">{t("participants")}</h2>
          <VoiceInviteDialog roomId={roomId} grantsEntry={moderates} />
        </div>

        <ul className="flex flex-wrap gap-4">
          {speakers.map((item) => (
            <Seat
              key={item.user.id}
              item={item}
              speaking={speaking.has(item.user.id) && !item.isMuted}
              canModerate={moderates && item.user.id !== meId}
              onModerate={moderate}
            />
          ))}
        </ul>

        {listeners.length > 0 ? (
          <ul className="flex flex-wrap gap-4 border-t border-border pt-3">
            {listeners.map((item) => (
              <Seat
                key={item.user.id}
                item={item}
                speaking={false}
                canModerate={moderates && item.user.id !== meId}
                onModerate={moderate}
              />
            ))}
          </ul>
        ) : null}
      </Card>

      {moderates && hands.length > 0 ? (
        <Card className="flex flex-col gap-2 p-4">
          <h2 className="text-sm font-semibold text-text">{t("handRaised")}</h2>
          {hands.map((item) => (
            <div key={item.user.id} className="flex items-center gap-2">
              <Avatar name={item.user.name} src={item.user.avatar} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm text-text">{item.user.name}</span>
              <Button size="sm" variant="secondary" onClick={() => moderate(item.user.id, "promote")}>
                {t("promote")}
              </Button>
            </div>
          ))}
        </Card>
      ) : null}

      <Card className="flex min-h-0 flex-col gap-2 p-4">
        <h2 className="text-sm font-semibold text-text">{t("chat")}</h2>

        <div className="flex max-h-72 flex-col gap-3 overflow-y-auto scrollbar-thin">
          {messages.map((message) => (
            <div key={message.id} className="flex items-start gap-2" data-room-message>
              <Avatar name={message.user.name} src={message.user.avatar} size="sm" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <p className="text-sm text-text">
                  <span className="font-medium">{message.user.name}</span>{" "}
                  {message.text ? <span className="text-text-muted">{message.text}</span> : null}
                </p>
                {message.media.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {message.media.map((item) =>
                      item.kind === "file" ? (
                        <FileCard key={item.id} item={item} mine={false} />
                      ) : item.kind === "image" ? (
                        <MediaImage
                          key={item.id}
                          src={`/api/media/${item.id}`}
                          alt=""
                          width={240}
                          height={180}
                          className="max-h-48 w-auto rounded-control"
                        />
                      ) : (
                        <video key={item.id} src={`/api/media/${item.id}`} controls preload="metadata" className="max-h-48 rounded-control" />
                      ),
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <MediaPicker ref={pickerRef} media={media} onChange={setMedia} max={4} surface="message" documents hideAddButton />
        <CameraCapture open={camera} onOpenChange={setCamera} onCapture={(file) => void pickerRef.current?.addFiles([file])} />

        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <AttachMenu
              className="absolute left-1.5 top-1/2 z-10 -translate-y-1/2 data-[state=open]:-translate-y-1/2"
              onMedia={() => pickerRef.current?.openFiles()}
              onCamera={() =>
                prefersDeviceCamera()
                  ? openDeviceCamera((file) => void pickerRef.current?.addFiles([file]))
                  : setCamera(true)
              }
              onFile={() => pickerRef.current?.openDocuments()}
            />
            <Input
              value={draft}
              maxLength={500}
              placeholder={t("chatPlaceholder")}
              aria-label={t("chatPlaceholder")}
              className="pl-11"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
            />
          </div>
          <Button size="icon" aria-label={tc("send")} onClick={send} disabled={!draft.trim() && media.length === 0}>
            <Send />
          </Button>
        </div>
      </Card>

      <div className="sticky bottom-4 flex flex-wrap items-center gap-2 rounded-full border border-border bg-surface-solid p-2 shadow-lifted">
        {/* Mikrofoni si ikonë: i gjelbër kur je në zë, i kuq me vijë kur je i heshtur. */}
        {talks ? (
          <button
            type="button"
            onClick={toggleMute}
            aria-pressed={!muted}
            aria-label={t(muted ? "unmute" : "mute")}
            title={t(muted ? "unmute" : "mute")}
            className={cn(
              "grid size-11 place-items-center rounded-full transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
              muted ? "bg-danger text-white" : "bg-success text-white",
            )}
            data-voice-mic={muted ? "off" : "on"}
          >
            {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>
        ) : (
          <Button size="sm" variant={hand ? "primary" : "ghost"} onClick={toggleHand} aria-pressed={hand}>
            <Hand />
            {t(hand ? "lowerHand" : "raiseHand")}
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {isHost ? (
            <Button size="sm" variant="danger" onClick={close} loading={pending}>
              <Square />
              {t("endRoom")}
            </Button>
          ) : null}

          <Button size="sm" variant="ghost" onClick={leave} loading={pending}>
            <LogOut />
            {t("leave")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Një pjesëmarrës. Unaza e gjelbër tregon që ka zë; kur flet, ajo ndizet dhe
 * pulson. Pritësi dhe moderatori kanë menynë me «⋯»: folës, dëgjues, heshtje, largim.
 */
function Seat({
  item,
  speaking,
  canModerate: allowed,
  onModerate,
}: {
  item: RoomParticipant;
  speaking: boolean;
  canModerate: boolean;
  onModerate: (userId: string, action: ModerationAction) => void;
}) {
  const t = useTranslations("voice");
  const speaks = canSpeak(item.role as VoiceRole);
  const [confirming, setConfirming] = React.useState(false);

  return (
    <li className="relative flex w-20 flex-col items-center gap-1 text-center" data-seat={item.user.username} data-speaking={speaking ? "true" : "false"}>
      <span
        className={cn(
          "relative flex rounded-full p-[3px] transition-shadow duration-150",
          speaks && !item.isMuted ? "ring-2 ring-success" : "ring-1 ring-border",
          speaking && "shadow-[0_0_0_4px_var(--color-success-50),0_0_18px_2px_var(--color-success)]",
        )}
      >
        {speaking ? (
          <span className="absolute inset-0 animate-ping rounded-full ring-2 ring-success motion-reduce:hidden" aria-hidden />
        ) : null}
        <Avatar name={item.user.name} src={item.user.avatar} size="lg" />
        {speaks && item.isMuted ? (
          <span className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-surface-solid text-danger-text ring-1 ring-border">
            <MicOff className="size-3" aria-hidden />
            <span className="sr-only">{t("mute")}</span>
          </span>
        ) : null}
        {item.handRaised ? (
          <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-warning text-[10px]">
            <Hand className="size-3 text-warning-contrast" aria-hidden />
            <span className="sr-only">{t("handRaised")}</span>
          </span>
        ) : null}
      </span>

      <span className="flex w-full items-center justify-center gap-0.5">
        <span className="truncate text-xs text-text">{item.user.name.split(" ")[0]}</span>
        {item.user.isVerified ? <VerifiedMark size="sm" /> : null}
      </span>

      <span className="text-[10px] text-text-muted">{speaking ? t("speaking") : t(item.role)}</span>

      {allowed && item.role !== "host" ? (
        <DropdownMenu onOpenChange={(open) => (open ? null : setConfirming(false))}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t("manage", { name: item.user.name })}
              className="absolute -right-1 top-8 grid size-6 place-items-center rounded-full border border-border bg-surface-solid text-text-muted shadow-soft hover:text-text"
              data-seat-menu
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => onModerate(item.user.id, speaks ? "demote" : "promote")}>
              {t(speaks ? "demote" : "promote")}
            </DropdownMenuItem>
            {speaks && !item.isMuted ? (
              <DropdownMenuItem onSelect={() => onModerate(item.user.id, "mute")}>{t("muteOther")}</DropdownMenuItem>
            ) : null}
            {confirming ? (
              <DropdownMenuItem
                onSelect={() => onModerate(item.user.id, "remove")}
                className="text-danger-text"
                data-seat-remove-confirm
              >
                {t("removeConfirm", { name: item.user.name.split(" ")[0] })}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onSelect={(event) => {
                  // Largimi kërkon një prekje të dytë: menyja mbetet hapur për konfirmim.
                  event.preventDefault();
                  setConfirming(true);
                }}
                className="text-danger-text"
                data-seat-remove
              >
                {t("remove")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  );
}
