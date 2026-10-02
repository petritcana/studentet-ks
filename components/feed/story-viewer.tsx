"use client";

import Link from "next/link";
import { extractMentions } from "@/lib/mentions";
import { TimeAgo } from "@/components/shared/time-ago";
import * as React from "react";
import { MediaImage } from "@/components/ui/media-image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { markStorySeen } from "@/lib/actions/stories";
import { StoryOwnerBar } from "./story-owner-bar";
import { StoryReplyBar } from "./story-reply-bar";
import type { StoryGroup } from "@/lib/queries/stories";
import { cn } from "@/lib/utils";

/** Sa rri një storje para se të kalojë vetë. */
const AUTO_ADVANCE_MS = 5000;
/** Videoja e storjes zgjat deri 15 sekonda; kjo vlen derisa të lexohet kohëzgjatja e vërtetë. */
const MAX_VIDEO_MS = 15_000;

/**
 * Shikuesi i stories.
 *
 * Prekja majtas dhe djathtas lëviz brenda të njëjtit autor, dhe kur mbarojnë
 * kalon te autori tjetër. Shirit progresi lart, një segment për storje, si
 * gjuha vizuale që studenti e njeh tashmë.
 */
export function StoryViewer({
  groups: initialGroups,
  startIndex,
  onClose,
  action,
  meId,
  ownerTools = false,
}: {
  groups: StoryGroup[];
  startIndex: number;
  onClose: () => void;
  /** Kush po shikon. Te storjet e të tjerëve del përgjigjja dhe reagimi. */
  meId?: string;
  /** Te rafti: storja ime ka Shto në dosje, Arkivo dhe Fshije. Te dosjet e profilit jo. */
  ownerTools?: boolean;
  /** Një veprim i pronarit në kokë, p.sh. «Ndrysho dosjen» te dosjet e profilit. */
  action?: { label: string; icon?: React.ReactNode; onClick: () => void };
}) {
  const t = useTranslations("stories");

  const router = useRouter();
  // Kopje lokale: storja e fshirë ose e arkivuar del menjëherë nga shikuesi.
  const [groups, setGroups] = React.useState(initialGroups);
  const [groupIndex, setGroupIndex] = React.useState(startIndex);
  const [itemIndex, setItemIndex] = React.useState(0);
  // Storja ndalet sa kohë studenti shkruan përgjigje ose ka një panel të hapur.
  const [paused, setPaused] = React.useState(false);

  const group = groups[groupIndex];
  const item = group?.items[itemIndex];

  const next = React.useCallback(() => {
    if (!group) return;
    if (itemIndex + 1 < group.items.length) {
      setItemIndex((value) => value + 1);
      return;
    }
    if (groupIndex + 1 < groups.length) {
      setGroupIndex((value) => value + 1);
      setItemIndex(0);
      return;
    }
    onClose();
  }, [group, groupIndex, groups.length, itemIndex, onClose]);

  const previous = React.useCallback(() => {
    if (itemIndex > 0) {
      setItemIndex((value) => value - 1);
      return;
    }
    if (groupIndex > 0) {
      const target = groups[groupIndex - 1];
      setGroupIndex(groupIndex - 1);
      setItemIndex(Math.max(0, target.items.length - 1));
    }
  }, [groupIndex, groups, itemIndex]);

  // Shënimi i pamjes ndodh sapo storja shfaqet, jo kur mbyllet.
  React.useEffect(() => {
    if (item) void markStorySeen(item.id);
  }, [item]);

  /*
    Koha e storjes ecën me `requestAnimationFrame`, jo me animacion CSS: shiriti
    mbushet para syve, ndalet kur studenti e mban gishtin ose shkruan, dhe nuk
    kalon menjëherë te tjetra kur shfletuesi kërkon lëvizje të reduktuar.
  */
  const [holding, setHolding] = React.useState(false);
  const [videoMs, setVideoMs] = React.useState<number | null>(null);
  const barRef = React.useRef<HTMLSpanElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const elapsedRef = React.useRef(0);
  const stopped = paused || holding;
  const duration = item?.kind === "video" ? (videoMs ?? MAX_VIDEO_MS) : AUTO_ADVANCE_MS;

  // Storja e re nis nga zero.
  React.useEffect(() => {
    elapsedRef.current = 0;
    setVideoMs(null);
    if (barRef.current) barRef.current.style.width = "0%";
  }, [item?.id]);

  React.useEffect(() => {
    const video = videoRef.current;
    if (video) {
      if (stopped) video.pause();
      else void video.play().catch(() => undefined);
    }
    if (stopped) return;

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsedRef.current += now - last;
      last = now;
      const ratio = Math.min(1, elapsedRef.current / duration);
      if (barRef.current) barRef.current.style.width = `${ratio * 100}%`;
      if (ratio >= 1) {
        next();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [stopped, duration, next, item?.id]);

  /*
    Mbajtja e gishtit ndal storjen, si te çdo aplikacion që studenti e njeh.
    Pas 200ms prekja quhet mbajtje dhe lëshimi nuk kalon te storja tjetër.
  */
  const holdTimerRef = React.useRef<number | null>(null);
  const heldRef = React.useRef(false);

  function pressStart() {
    heldRef.current = false;
    holdTimerRef.current = window.setTimeout(() => {
      heldRef.current = true;
      setHolding(true);
    }, 200);
  }

  function pressEnd() {
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    setHolding(false);
  }

  function tap(direction: "previous" | "next") {
    // Lëshimi pas një mbajtjeje vetëm e rinis storjen, nuk e ndërron.
    if (heldRef.current) {
      heldRef.current = false;
      return;
    }
    if (direction === "next") next();
    else previous();
  }

  /** Storja aktuale u fshi ose u arkivua: hiqet dhe shikuesi vazhdon me tjetrën. */
  const removeCurrent = React.useCallback(() => {
    setPaused(false);
    router.refresh();
    const remaining = (group?.items ?? []).filter((_, index) => index !== itemIndex);
    if (remaining.length > 0) {
      setGroups((current) => current.map((entry, index) => (index === groupIndex ? { ...entry, items: remaining, count: remaining.length } : entry)));
      setItemIndex((value) => Math.min(value, remaining.length - 1));
      return;
    }
    const others = groups.filter((_, index) => index !== groupIndex);
    if (others.length === 0) {
      onClose();
      return;
    }
    setGroups(others);
    setGroupIndex((value) => Math.min(value, others.length - 1));
    setItemIndex(0);
  }, [group, groupIndex, groups, itemIndex, onClose, router]);

  const mine = Boolean(meId) && group?.id === meId;

  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, previous, onClose]);

  if (!group || !item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("open", { name: group.name })}
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 p-0 sm:p-6"
    >
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-surface sm:h-[85dvh] sm:rounded-lg">
        <div className="absolute inset-x-0 top-0 z-10 flex gap-1 p-2">
          {group.items.map((entry, index) => (
            <span key={entry.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30" data-story-segment={index === itemIndex ? "current" : index < itemIndex ? "done" : "next"}>
              {index === itemIndex ? (
                <span ref={barRef} className="block h-full w-0 rounded-full bg-white" data-story-progress />
              ) : (
                <span className={cn("block h-full rounded-full bg-white", index < itemIndex ? "w-full" : "w-0")} />
              )}
            </span>
          ))}
        </div>

        <header className={cn("absolute inset-x-0 top-3 z-10 flex items-center gap-2.5 px-3 pt-2 transition-opacity duration-150", holding && "opacity-0")}>
          <Avatar name={group.name} src={group.avatar} size="sm" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-white">{group.name}</span>
            <span className="tabular text-xs text-white/70">
              <TimeAgo value={item.createdAt} />
            </span>
          </span>
          {action ? (
            <button
              type="button"
              onClick={action.onClick}
              className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/25 [&_svg]:size-3.5"
              data-story-action
            >
              {action.icon}
              {action.label}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className={cn(action ? "" : "ml-auto", "grid size-8 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white")}
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="relative flex flex-1 items-center justify-center bg-black">
          {item.kind === "video" ? (
            <video
              ref={videoRef}
              src={item.mediaUrl}
              autoPlay
              muted
              playsInline
              onLoadedMetadata={(event) => {
                const seconds = event.currentTarget.duration;
                if (Number.isFinite(seconds) && seconds > 0) setVideoMs(Math.min(seconds * 1000, MAX_VIDEO_MS));
              }}
              className="size-full object-cover"
            />
          ) : (
            <MediaImage
              src={item.mediaUrl}
              alt={item.caption ?? ""}
              fill
              sizes="(max-width: 640px) 100vw, 420px"
              className="object-contain"
            />
          )}

          {/* Teksti i storjes është pjekur brenda fotos; këtu mbetet vetëm për lexuesit e ekranit. */}
          {item.caption ? <p className="sr-only">{item.caption}</p> : null}
        </div>

        {/* Përmendjet: teksti është te fotoja, kurse emrat hapen me prekje te profili. */}
        {item.caption && extractMentions(item.caption).length > 0 ? (
          <div className="absolute inset-x-3 bottom-24 z-30 flex flex-wrap gap-1.5" data-story-mentions>
            {extractMentions(item.caption).map((username) => (
              <Link
                key={username}
                href={`/u/${username}`}
                className="rounded-full bg-story-glass px-2.5 py-1 text-xs font-semibold text-story-ink backdrop-blur-[6px]"
                data-story-mention={username}
              >
                @{username}
              </Link>
            ))}
          </div>
        ) : null}

        {mine && ownerTools ? (
          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10">
            <StoryOwnerBar key={item.id} storyId={item.id} onPauseChange={setPaused} onRemoved={removeCurrent} />
          </div>
        ) : null}
        {meId && !mine ? (
          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10">
            <StoryReplyBar key={item.id} storyId={item.id} authorName={group.name.split(" · ")[0]} onPauseChange={setPaused} />
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => tap("previous")}
          onPointerDown={pressStart}
          onPointerUp={pressEnd}
          onPointerLeave={pressEnd}
          onPointerCancel={pressEnd}
          onContextMenu={(event) => event.preventDefault()}
          aria-label={t("previous")}
          className="absolute left-0 top-16 bottom-0 z-10 w-1/3 cursor-default select-none [-webkit-touch-callout:none] focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          <ChevronLeft className="ml-2 size-5 text-white/0 transition-colors hover:text-white/70" />
        </button>
        <button
          type="button"
          onClick={() => tap("next")}
          onPointerDown={pressStart}
          onPointerUp={pressEnd}
          onPointerLeave={pressEnd}
          onPointerCancel={pressEnd}
          onContextMenu={(event) => event.preventDefault()}
          aria-label={t("next")}
          className="absolute right-0 top-16 bottom-0 z-10 w-2/3 cursor-default select-none [-webkit-touch-callout:none] focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          <ChevronRight className="ml-auto mr-2 size-5 text-white/0 transition-colors hover:text-white/70" />
        </button>
      </div>
    </div>
  );
}
