"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, CheckCheck, CornerUpLeft, Download, FileText, Mic, Pencil, Phone, SmilePlus, Trash2, Video } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MediaImage } from "@/components/ui/media-image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatTime } from "@/lib/format";
import { formatBytes, type MediaRef } from "@/lib/media";
import { VoicePlayer } from "./voice-recorder";
import type { SharedPostView } from "@/lib/queries/messages";
import { cn } from "@/lib/utils";

/** Emoji-t e lejuara. Të pakta me qëllim: një rresht që lexohet me një sy. */
export const MESSAGE_EMOJI = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

export type MessageDto = {
  id: string;
  text: string;
  media: MediaRef[];
  kind: string;
  edited: boolean;
  deleted: boolean;
  createdAt: string;
  mine: boolean;
  seen: boolean;
  /** Sa anëtarë e panë mesazhin tim (në grup). */
  seenCount: number;
  /** Dikush tjetër ka qenë aktiv pas tij (dy shenja gri). */
  delivered: boolean;
  /** Dita në orën e Kosovës dhe titulli i saj («Sot», «Dje», «27 shtator»). */
  day: string;
  dayLabel: string;
  replyTo: { id: string; author: string; text: string } | null;
  reactions: Record<string, number>;
  myReaction: string | null;
  /** Storja te e cila i përgjigjet ose reagon mesazhi. */
  story: { kind: string; mediaUrl: string } | null;
  /** Rreshti i thirrjes: me video apo jo, a është ende e gjallë, sa zgjati. */
  call?: { id: string; video: boolean; live: boolean; minutes: number | null } | null;
  /** Postimi i ndarë me «Dërgo»; `visible: false` kur marrësi nuk e ka në rrethin e vet. */
  post?: SharedPostView | null;
  author: { name: string; username: string; avatar: string | null } | null;
};

/** Sa larg duhet tërhequr balona anash që të bëhet përgjigje. */
const SWIPE_REPLY_PX = 56;
/** Dy prekje brenda kësaj kohe janë «zemër». */
const DOUBLE_TAP_MS = 280;
/** Prekja e mbajtur kaq gjatë hap menynë e reagimeve. */
const LONG_PRESS_MS = 480;

/**
 * Një mesazh i vetëm, si balonë.
 *
 * Balonat e një personi rrinë afër njëra-tjetrës (grupi), me avatarin dhe orën
 * vetëm te e fundit. Këndi i vogël bie nga ana e folësit. Prekja e balonës
 * tregon orën, dy prekje japin një zemër, tërheqja anash e bën përgjigje, dhe
 * prekja e mbajtur hap menynë. Te kompjuteri menyja del edhe nga butoni anash.
 */
export function MessageBubble({
  message,
  inGroup,
  startsGroup,
  endsGroup,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onJump,
  onJoinCall,
}: {
  message: MessageDto;
  inGroup: boolean;
  /** E para e grupit të balonave të një personi. */
  startsGroup: boolean;
  /** E fundit e grupit: aty dalin ora, gjendja dhe avatari. */
  endsGroup: boolean;
  onReply: (message: MessageDto) => void;
  onEdit: (message: MessageDto) => void;
  onDelete: (message: MessageDto) => void;
  onReact: (message: MessageDto, emoji: string) => void;
  onJump: (id: string) => void;
  onJoinCall?: (callId: string) => void;
}) {
  const t = useTranslations("messages");
  const tc = useTranslations("common");
  const [showTime, setShowTime] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [dragX, setDragX] = React.useState(0);

  const reactions = Object.entries(message.reactions).filter(([, count]) => count > 0);
  const isStoryMessage = message.kind === "story_reply" || message.kind === "story_reaction";

  // Prekjet: një e shkurtër tregon orën, dy japin zemër, e mbajtura hap menynë.
  const lastTap = React.useRef(0);
  const tapTimer = React.useRef<number | null>(null);
  const holdTimer = React.useRef<number | null>(null);
  const start = React.useRef<{ x: number; y: number; touch: boolean } | null>(null);
  const moved = React.useRef(false);

  function onPointerDown(event: React.PointerEvent) {
    if (message.deleted) return;
    start.current = { x: event.clientX, y: event.clientY, touch: event.pointerType !== "mouse" };
    moved.current = false;
    if (event.pointerType !== "mouse") {
      holdTimer.current = window.setTimeout(() => {
        moved.current = true;
        setMenuOpen(true);
      }, LONG_PRESS_MS);
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    const origin = start.current;
    if (!origin || !origin.touch) return;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      moved.current = true;
      if (holdTimer.current) window.clearTimeout(holdTimer.current);
    }
    // Vetëm tërheqja horizontale drejt qendrës së bisedës bëhet përgjigje.
    if (Math.abs(dx) > Math.abs(dy)) setDragX(Math.max(0, Math.min(80, message.mine ? -dx : dx)));
  }

  function onPointerUp() {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    if (dragX >= SWIPE_REPLY_PX) onReply(message);
    setDragX(0);
    start.current = null;
  }

  function onClick(event: React.MouseEvent) {
    if (message.deleted || moved.current) return;
    // Lidhjet dhe butonat brenda balonës punojnë vetë.
    if ((event.target as HTMLElement).closest("a,button,audio,video")) return;
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      if (tapTimer.current) window.clearTimeout(tapTimer.current);
      lastTap.current = 0;
      if (message.myReaction !== "❤️") onReact(message, "❤️");
      return;
    }
    lastTap.current = now;
    tapTimer.current = window.setTimeout(() => setShowTime((value) => !value), DOUBLE_TAP_MS);
  }

  /*
    Gjendja e mesazhit tim: një vijë kur u dërgua, dy vija të errëta kur arriti,
    dhe sytë në vend të vijave kur e pa. Te grupi mjafton që ta ketë parë dikush.
  */
  const status = (inGroup ? message.seenCount > 0 : message.seen) ? "seen" : message.delivered ? "delivered" : "sent";

  if (message.kind === "call" && message.call) {
    return <CallLine message={message} onJoin={onJoinCall} />;
  }

  return (
    <div
      id={`msg-${message.id}`}
      data-message-id={message.id}
      data-starts-group={startsGroup ? "true" : undefined}
      className={cn(
        "group flex w-full items-end gap-2 animate-bubble",
        message.mine ? "justify-end" : "justify-start",
        startsGroup ? "mt-3" : "mt-0.5",
      )}
    >
      {inGroup && !message.mine ? (
        endsGroup && message.author ? (
          <Avatar name={message.author.name} src={message.author.avatar} size="xs" className="mb-5" />
        ) : (
          <span className="w-6 shrink-0" aria-hidden />
        )
      ) : null}

      {message.mine && !message.deleted ? <ActionsMenu /> : null}

      <div className={cn("flex min-w-0 max-w-[72%] flex-col gap-1", message.mine ? "items-end" : "items-start")}>
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={onClick}
          // Dy prekjet janë zemër, jo zgjedhje fjale.
          onMouseDown={(event) => {
            if (event.detail > 1) event.preventDefault();
          }}
          onContextMenu={(event) => {
            if (start.current?.touch) event.preventDefault();
          }}
          style={dragX ? { transform: `translateX(${message.mine ? -dragX : dragX}px)` } : undefined}
          className={cn(
            "relative flex min-w-0 select-text flex-col gap-1 rounded-[18px] px-3.5 py-2 transition-transform duration-150",
            message.mine ? "bg-primary bg-bubble-mine text-white" : "border border-border bg-surface-2 text-text",
            message.mine && endsGroup && "rounded-br-[5px]",
            !message.mine && endsGroup && "rounded-bl-[5px]",
            message.deleted && "italic opacity-70",
          )}
          data-bubble
        >
          {dragX > 0 ? (
            <CornerUpLeft
              className={cn(
                "absolute top-1/2 size-4 -translate-y-1/2 text-text-muted transition-opacity",
                message.mine ? "-right-7" : "-left-7",
                dragX >= SWIPE_REPLY_PX ? "opacity-100" : "opacity-40",
              )}
              aria-hidden
            />
          ) : null}

          {inGroup && startsGroup && !message.mine && message.author ? (
            <Link href={`/u/${message.author.username}`} className="text-xs font-bold text-brand-500 hover:underline">
              {message.author.name}
            </Link>
          ) : null}

          {message.replyTo ? (
            <button
              type="button"
              onClick={() => onJump(message.replyTo!.id)}
              className={cn(
                "flex min-w-0 flex-col gap-0.5 rounded-[10px] border-l-2 px-2 py-1 text-left text-[11px]",
                message.mine ? "border-white/60 bg-white/15" : "border-brand-500/60 bg-surface",
              )}
              data-reply-quote
            >
              <span className="font-semibold">{message.replyTo.author}</span>
              <span className="line-clamp-2 opacity-85">{message.replyTo.text || t("deleted")}</span>
            </button>
          ) : null}

          {isStoryMessage && !message.deleted ? <StoryReference message={message} /> : null}
          {message.post && !message.deleted ? <SharedPostCard post={message.post} mine={message.mine} /> : null}

          {message.deleted ? (
            <p className="text-sm">{t("deleted")}</p>
          ) : (
            <>
              {message.media.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {message.media.map((item) =>
                    item.kind === "file" ? (
                      <FileCard key={item.id} item={item} mine={message.mine} />
                    ) : item.kind === "image" ? (
                      <MediaImage key={item.id} src={`/api/media/${item.id}`} alt="" width={320} height={240} className="max-h-64 w-auto rounded-[12px]" />
                    ) : message.kind === "voice" ? (
                      <VoicePlayer key={item.id} id={message.id} src={`/api/media/${item.id}`} durationMs={item.durationMs} mine={message.mine} />
                    ) : (
                      <video key={item.id} src={`/api/media/${item.id}`} controls preload="metadata" className="max-h-64 rounded-[12px]" />
                    ),
                  )}
                </div>
              ) : null}

              {message.kind === "voice" && message.media.length === 0 ? (
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <Mic className="size-4" />
                  {t("voiceMessage")}
                </span>
              ) : null}

              {message.text ? (
                <p
                  className={cn("whitespace-pre-wrap break-words", message.kind === "story_reaction" ? "text-4xl leading-none" : "text-[14.5px] leading-snug")}
                  data-story-reaction-text={message.kind === "story_reaction" ? "" : undefined}
                >
                  {message.text}
                </p>
              ) : null}
            </>
          )}
        </div>

        {reactions.length > 0 ? (
          <div className={cn("-mt-2.5 flex flex-wrap gap-1 px-2", message.mine ? "justify-end" : "justify-start")}>
            {reactions.map(([emoji, count]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(message, emoji)}
                aria-pressed={message.myReaction === emoji}
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-px text-[11px] shadow-soft",
                  message.myReaction === emoji ? "border-brand-500 bg-surface-solid" : "border-border bg-surface-solid",
                )}
                data-reaction={emoji}
              >
                <span>{emoji}</span>
                {count > 1 ? <span className="tabular text-text-muted">{count}</span> : null}
              </button>
            ))}
          </div>
        ) : null}

        {endsGroup || showTime ? (
          <span className="flex items-center gap-1 px-1 text-[10.5px] text-text-dim" data-message-meta>
            {message.edited ? <span>{t("edited")} ·</span> : null}
            <span className="tabular">{formatTime(message.createdAt)}</span>
            {message.mine && !message.deleted ? (
              status === "seen" ? (
                <span
                  role="img"
                  className="text-[13px] leading-none"
                  aria-label={inGroup ? t("seenByCount", { count: message.seenCount }) : t("seen")}
                  title={inGroup ? t("seenByCount", { count: message.seenCount }) : t("seen")}
                  data-status="seen"
                  data-seen-mark
                >
                  👀
                </span>
              ) : status === "delivered" ? (
                <CheckCheck className="size-3.5 text-text-muted" aria-label={t("delivered")} data-status="delivered" />
              ) : (
                <Check className="size-3.5" aria-label={t("sent")} data-status="sent" />
              )
            ) : null}
          </span>
        ) : null}

      </div>

      {!message.mine && !message.deleted ? <ActionsMenu /> : null}
    </div>
  );

  function ActionsMenu() {
    return (
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="iconSm"
            aria-label={t("messageActions")}
            className="mb-5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 max-lg:hidden"
          >
            <SmilePlus />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={message.mine ? "end" : "start"}>
          <div className="flex gap-1 px-1 py-1.5">
            {MESSAGE_EMOJI.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(message, emoji);
                  setMenuOpen(false);
                }}
                aria-label={emoji}
                className={cn("grid size-8 place-items-center rounded-md text-lg transition-colors hover:bg-surface-2", message.myReaction === emoji && "bg-brand-50")}
              >
                {emoji}
              </button>
            ))}
          </div>
          <DropdownMenuItem onSelect={() => onReply(message)}>
            <CornerUpLeft />
            {t("reply")}
          </DropdownMenuItem>
          {message.mine ? (
            <>
              {message.text ? (
                <DropdownMenuItem onSelect={() => onEdit(message)}>
                  <Pencil />
                  {tc("edit")}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem destructive onSelect={() => onDelete(message)}>
                <Trash2 />
                {tc("delete")}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
}

/**
 * Thirrja si rresht në mes të bisedës: kush e nisi, zë apo video, dhe «Hyr»
 * sa kohë është e gjallë. Pas saj mbetet sa zgjati.
 */
function CallLine({ message, onJoin }: { message: MessageDto; onJoin?: (callId: string) => void }) {
  const t = useTranslations("calls");
  const call = message.call!;
  const Icon = call.video ? Video : Phone;
  const who = message.mine ? t("you") : (message.author?.name.split(" ")[0] ?? t("someone"));

  return (
    <div id={`msg-${message.id}`} data-message-id={message.id} className="my-2 flex justify-center animate-bubble" data-call-line>
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 py-1 pl-2 pr-1.5 text-xs text-text">
        <span className={cn("grid size-6 place-items-center rounded-full", call.live ? "bg-success/15 text-success-text" : "bg-surface text-text-muted")}>
          <Icon className="size-3.5" aria-hidden />
        </span>
        <span className="font-medium">
          {call.video ? t("videoStartedBy", { name: who }) : t("audioStartedBy", { name: who })}
        </span>
        <span className="tabular text-text-muted">{formatTime(message.createdAt)}</span>
        {call.live ? (
          onJoin ? (
            <Button size="sm" className="h-7 rounded-full px-3" onClick={() => onJoin(call.id)} data-call-join-line>
              {t("join")}
            </Button>
          ) : null
        ) : (
          <span className="pr-1.5 text-text-muted">{call.minutes ? t("lasted", { minutes: call.minutes }) : t("ended")}</span>
        )}
      </span>
    </div>
  );
}

/** Postimi i ndarë: autori, fillimi i tekstit dhe fotoja e parë; prekja e hap. */
function SharedPostCard({ post, mine }: { post: SharedPostView; mine: boolean }) {
  const t = useTranslations("messages");
  if (!post.visible) {
    return (
      <span className={cn("rounded-[12px] border px-3 py-2 text-xs italic", mine ? "border-white/30" : "border-border")} data-shared-post="hidden">
        {t("sharedPostHidden")}
      </span>
    );
  }
  return (
    <Link
      href={`/postimi/${post.id}`}
      className={cn(
        "flex w-64 max-w-full flex-col overflow-hidden rounded-[14px] border transition-colors",
        mine ? "border-white/30 bg-white/10 hover:bg-white/15" : "border-border bg-surface hover:bg-surface-2",
      )}
      data-shared-post={post.id}
    >
      {post.image ? <MediaImage src={post.image} alt="" width={256} height={144} className="aspect-video w-full object-cover" /> : null}
      <span className="flex flex-col gap-1 px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <Avatar name={post.author.name} src={post.author.avatar} size="xs" />
          {post.author.name}
        </span>
        {post.text ? <span className="line-clamp-3 text-[13px] leading-snug opacity-90">{post.text}</span> : null}
        <span className="text-[11px] font-semibold opacity-75">{t("openPost")}</span>
      </span>
    </Link>
  );
}

/** Ndarësi i ditës: kapsulë e vogël në mes, «Sot», «Dje», «27 shtator». */
export function DaySeparator({ label }: { label: string }) {
  return (
    <div className="my-3 flex justify-center" role="separator" aria-label={label} data-day-separator>
      <span className="rounded-full border border-border bg-surface-2 px-3 py-0.5 text-[11px] font-semibold text-text-muted">{label}</span>
    </div>
  );
}

/**
 * Storja mbi përgjigjen ose reagimin: një parapamje e vogël dhe kujt i shkoi.
 * Kur storja është fshirë, mbetet vetëm rreshti që thotë se s'është më.
 */
function StoryReference({ message }: { message: MessageDto }) {
  const t = useTranslations("messages");
  const key =
    message.kind === "story_reaction"
      ? message.mine ? "storyReactedMine" : "storyReactedTheirs"
      : message.mine ? "storyRepliedMine" : "storyRepliedTheirs";

  return (
    <span className="flex flex-col gap-1.5" data-story-message>
      <span className="text-[11px] font-medium opacity-80">{t(key)}</span>
      {message.story ? (
        <span className="block h-[106px] w-[60px] overflow-hidden rounded-[10px] bg-black/30">
          {message.story.kind === "video" ? (
            <video src={message.story.mediaUrl} muted playsInline preload="metadata" className="size-full object-cover" />
          ) : (
            <MediaImage src={message.story.mediaUrl} alt="" width={60} height={106} className="size-full object-cover" />
          )}
        </span>
      ) : (
        <span className="text-[11px] italic opacity-70">{t("storyGone")}</span>
      )}
    </span>
  );
}

/** Një dokument në bisedë: emri, lloji dhe madhësia, dhe prekja e shkarkon. */
export function FileCard({ item, mine }: { item: MediaRef; mine: boolean }) {
  const t = useTranslations("messages");
  return (
    <a
      href={`/api/media/${item.id}`}
      download={item.name ?? `skedar.${item.extension}`}
      className={cn(
        "flex w-60 max-w-full items-center gap-2.5 rounded-control border px-3 py-2.5 transition-colors duration-150",
        mine ? "border-white/30 bg-white/12 hover:bg-white/20" : "border-border bg-surface hover:bg-surface-2",
      )}
      aria-label={t("fileDownload", { name: item.name ?? item.extension })}
      data-file-card
    >
      <FileText className="size-7 shrink-0" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold">{item.name ?? `skedar.${item.extension}`}</span>
        <span className="text-[11px] uppercase opacity-75">
          {item.extension} · {formatBytes(item.bytes ?? 0)}
        </span>
      </span>
      <Download className="size-4 shrink-0 opacity-80" aria-hidden />
    </a>
  );
}
