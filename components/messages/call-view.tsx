"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Ear, Maximize2, Mic, MicOff, Minimize2, PhoneOff, SwitchCamera, Video, VideoOff, Volume2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useVoiceMesh, type AudioOutput, type Facing } from "@/components/voice/use-voice-mesh";
import { endCall, leaveCall } from "@/lib/actions/calls";
import { formatDuration } from "@/lib/media";
import { cn } from "@/lib/utils";

type Person = { id: string; name: string; avatar: string | null };
type CallState = {
  id: string;
  video: boolean;
  ended: boolean;
  endReason: string | null;
  ringing: boolean;
  group: boolean;
  canEnd: boolean;
  participants: Person[];
};

const BEAT_MS = 4000;

/**
 * Ekrani i thirrjes, mbi çdo faqe.
 *
 * Rreh te `/api/thirrje/[id]` që serveri ta dijë se je brenda, dhe lidhet me
 * secilin tjetër përmes rrjetit WebRTC. Butonat: mikrofoni, zëri në altoparlant ose
 * te veshi, kamera (edhe në thirrje zanore), kthimi i kamerës përpara ose mbrapa,
 * dhe dalja. Admini i grupit e mbyll për të gjithë.
 *
 * Me dy veta, si te telefoni: tjetri e mbush ekranin me pamjen e plotë të kamerës
 * së tij, dhe unë dal i vogël në qoshe.
 */
export function CallView({
  callId,
  me,
  title,
  initialVideo,
  onClose,
}: {
  callId: string;
  me: Person;
  title: string;
  initialVideo: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("calls");
  const [state, setState] = React.useState<CallState | null>(null);
  const [muted, setMuted] = React.useState(false);
  // Si te telefoni: thirrja zanore nis te veshi, video thirrja në altoparlant.
  // Në kompjuter s'ka vesh: gjithmonë altoparlanti.
  const [output, setOutput] = React.useState<AudioOutput>(() =>
    !initialVideo && typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches
      ? "earpiece"
      : "speaker",
  );
  const [camera, setCamera] = React.useState(initialVideo);
  const [facing, setFacing] = React.useState<Facing>("user");
  const [elapsed, setElapsed] = React.useState(0);
  const [canFlip, setCanFlip] = React.useState(false);
  // E vogël: thirrja vazhdon si pilulë poshtë, dhe studenti lëviz nëpër platformë.
  const [minimized, setMinimized] = React.useState(false);
  const closedRef = React.useRef(false);

  const close = React.useCallback(
    (reason: string | null) => {
      if (closedRef.current) return;
      closedRef.current = true;
      if (reason === "declined") toast.info(t("declinedToast"));
      else if (reason === "missed") toast.info(t("missedToast"));
      else if (reason) toast.info(t("endedToast"));
      onClose();
    },
    [onClose, t],
  );

  // Rrahja: më mban brenda dhe më tregon kush tjetër është.
  React.useEffect(() => {
    let cancelled = false;
    async function beat() {
      const response = await fetch(`/api/thirrje/${callId}`, { method: "POST", cache: "no-store" }).catch(() => null);
      if (cancelled || !response) return;
      if (!response.ok) {
        close("ended");
        return;
      }
      const data = (await response.json()) as CallState;
      if (data.ended) {
        close(data.endReason ?? "ended");
        return;
      }
      setState(data);
    }
    void beat();
    const timer = window.setInterval(beat, BEAT_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [callId, close]);

  React.useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed((Date.now() - started) / 1000), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Kthimi i kamerës ka kuptim vetëm kur pajisja ka më shumë se një.
  React.useEffect(() => {
    void navigator.mediaDevices
      ?.enumerateDevices()
      .then((devices) => setCanFlip(devices.filter((device) => device.kind === "videoinput").length > 1))
      .catch(() => setCanFlip(false));
  }, [camera]);

  const others = (state?.participants ?? []).filter((person) => person.id !== me.id);
  const mesh = useVoiceMesh({
    roomId: callId,
    meId: me.id,
    peerIds: others.map((person) => person.id),
    canTalk: true,
    muted,
    signalUrl: `/api/thirrje/${callId}/sinjal`,
    camera,
    facing,
    output,
  });

  // Kamera e ndezur kalon në altoparlant, si te telefoni; studenti e kthen te veshi kur do.
  const previousCamera = React.useRef(camera);
  React.useEffect(() => {
    if (camera && !previousCamera.current) setOutput("speaker");
    previousCamera.current = camera;
  }, [camera]);

  React.useEffect(() => {
    if (mesh.cameraError) {
      toast.error(t("cameraBlocked"));
      setCamera(false);
    }
  }, [mesh.cameraError, t]);

  async function hangUp() {
    closedRef.current = true;
    await leaveCall(callId);
    onClose();
  }

  async function endForAll() {
    closedRef.current = true;
    await endCall(callId);
    onClose();
  }

  const tiles: { person: Person; stream: MediaStream | null; local: boolean }[] = [
    ...others.map((person) => ({ person, stream: mesh.streams[person.id] ?? null, local: false })),
    { person: me, stream: mesh.localStream, local: true },
  ];

  const status = !state
    ? t("connecting")
    : others.length === 0
      ? state.ringing && !state.group
        ? t("ringing")
        : t("waiting")
      : t("inCall", { count: others.length + 1 });

  if (minimized) {
    return createPortal(
      <div
        className="fixed bottom-24 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full border border-border-strong bg-surface-solid py-1.5 pl-2 pr-1.5 text-text shadow-lifted lg:bottom-6"
        role="status"
        data-call-mini
      >
        <span className="relative grid size-2.5 shrink-0 place-items-center" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2.5 rounded-full bg-success" />
        </span>
        <button type="button" onClick={() => setMinimized(false)} className="flex min-w-0 flex-col text-left" data-call-expand>
          <span className="max-w-40 truncate text-sm font-semibold">{title}</span>
          <span className="tabular text-[11px] text-text-muted">{formatDuration(elapsed * 1000)}</span>
        </button>
        <button
          type="button"
          onClick={() => setMuted((value) => !value)}
          aria-pressed={muted}
          aria-label={muted ? t("unmute") : t("mute")}
          className={cn("grid size-9 place-items-center rounded-full", muted ? "bg-danger-solid text-white" : "bg-surface-2 text-text")}
        >
          {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        </button>
        <button type="button" onClick={() => setMinimized(false)} aria-label={t("expand")} className="grid size-9 place-items-center rounded-full bg-surface-2 text-text">
          <Maximize2 className="size-4" />
        </button>
        <button type="button" onClick={() => void hangUp()} aria-label={t("leave")} className="grid size-9 place-items-center rounded-full bg-danger-solid text-white" data-call-leave>
          <PhoneOff className="size-4" />
        </button>
      </div>,
      document.body,
    );
  }

  // Në trup të faqes: xhami i kartës së bisedës (`backdrop-filter`) do ta mbyllte `fixed` brenda vetes.
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-bg text-text"
      role="dialog"
      aria-modal="true"
      aria-label={t("screenLabel", { title })}
      data-call-view
      data-call-video={camera ? "true" : "false"}
    >
      <div aria-hidden className="aurora">
        <span />
        <span />
      </div>

      <header className="flex items-center justify-between gap-3 px-5 pb-2 pt-5">
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-display text-lg font-bold">{title}</span>
          <span className="tabular text-xs text-text-muted" data-call-status>
            {status} · {formatDuration(elapsed * 1000)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {mesh.needsGesture ? (
            <Button size="sm" variant="secondary" onClick={mesh.resume}>
              <Volume2 />
              {t("listen")}
            </Button>
          ) : null}
          <Button variant="secondary" size="icon" onClick={() => setMinimized(true)} aria-label={t("minimize")} title={t("minimize")} data-call-minimize>
            <Minimize2 />
          </Button>
        </div>
      </header>

      {mesh.micError ? (
        <p className="mx-5 rounded-control bg-danger-50 px-3 py-2 text-xs text-danger-text">{t("micBlocked")}</p>
      ) : null}

      {others.length === 1 ? (
        // Me dy veta: tjetri në tërë ekranin, unë i vogël në qoshe.
        <div className="relative min-h-0 flex-1 p-4" data-call-stage>
          <CallTile
            variant="stage"
            person={tiles[0].person}
            stream={tiles[0].stream}
            local={false}
            mirrored={false}
            speaking={mesh.speaking.has(tiles[0].person.id)}
            youLabel={t("you")}
          />
          <div className="absolute bottom-7 right-7 w-28 sm:w-40">
            <CallTile
              variant="pip"
              person={me}
              stream={mesh.localStream}
              local
              mirrored={facing === "user"}
              speaking={mesh.speaking.has(me.id)}
              youLabel={t("you")}
            />
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "grid min-h-0 flex-1 gap-3 p-4",
            tiles.length <= 1 ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-3",
          )}
        >
          {tiles.map((tile) => (
            <CallTile
              key={tile.person.id}
              variant="grid"
              person={tile.person}
              stream={tile.stream}
              local={tile.local}
              mirrored={tile.local && facing === "user"}
              speaking={mesh.speaking.has(tile.person.id)}
              youLabel={t("you")}
            />
          ))}
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-center gap-3 px-5 pb-8 pt-3 sm:gap-4">
        <ControlButton
          active={!muted}
          onClick={() => setMuted((value) => !value)}
          label={muted ? t("unmute") : t("mute")}
          data="mic"
        >
          {muted ? <MicOff className="size-6" /> : <Mic className="size-6" />}
        </ControlButton>
        <ControlButton
          active={output === "speaker"}
          offIsNeutral
          onClick={() => setOutput((value) => (value === "speaker" ? "earpiece" : "speaker"))}
          label={output === "speaker" ? t("toEarpiece") : t("toSpeaker")}
          data="speaker"
          state={output}
        >
          {output === "speaker" ? <Volume2 className="size-6" /> : <Ear className="size-6" />}
        </ControlButton>
        <ControlButton
          active={camera}
          offIsNeutral
          onClick={() => setCamera((value) => !value)}
          label={camera ? t("cameraOff") : t("cameraOn")}
          data="camera"
        >
          {camera ? <Video className="size-6" /> : <VideoOff className="size-6" />}
        </ControlButton>
        {camera && canFlip ? (
          <ControlButton
            active
            onClick={() => setFacing((value) => (value === "user" ? "environment" : "user"))}
            label={t("flipCamera")}
            data="flip"
          >
            <SwitchCamera className="size-6" />
          </ControlButton>
        ) : null}
        <button
          type="button"
          onClick={() => void hangUp()}
          aria-label={t("leave")}
          className="grid size-16 place-items-center rounded-full bg-danger-solid text-white transition-transform duration-150 hover:scale-105 active:scale-95"
          data-call-leave
        >
          <PhoneOff className="size-7" />
        </button>
        {state?.group && state.canEnd ? (
          <Button variant="secondary" onClick={() => void endForAll()} data-call-end-all>
            {t("endForAll")}
          </Button>
        ) : null}
      </footer>
    </div>,
    document.body,
  );
}

/** Buton i rrumbullakët i thirrjes. I fikuri del i kuq, përveç kamerës që mund të mbetet e fikur qetë. */
function ControlButton({
  active,
  offIsNeutral = false,
  onClick,
  label,
  data,
  state,
  children,
}: {
  active: boolean;
  offIsNeutral?: boolean;
  onClick: () => void;
  label: string;
  data: string;
  /** Gjendja si fjalë, kur butoni ka më shumë se ndezur e fikur. */
  state?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!active}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-14 place-items-center rounded-full transition-colors duration-150",
        active || offIsNeutral ? "bg-surface-2 text-text hover:bg-border" : "bg-danger-solid text-white",
        offIsNeutral && !active && "text-text-muted",
      )}
      data-call-control={data}
      data-state={state}
    >
      {children}
    </button>
  );
}

/** Një pjesëmarrës: kamera kur e ka të ndezur, përndryshe fytyra me unazën e zërit. */
function CallTile({
  variant,
  person,
  stream,
  local,
  mirrored,
  speaking,
  youLabel,
}: {
  /** stage: tërë ekrani; pip: unë i vogël në qoshe; grid: thirrja në grup. */
  variant: "stage" | "pip" | "grid";
  person: Person;
  stream: MediaStream | null;
  local: boolean;
  mirrored: boolean;
  speaking: boolean;
  youLabel: string;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [showVideo, setShowVideo] = React.useState(false);
  const [tracks, setTracks] = React.useState(0);
  // Forma e vërtetë e kamerës (në këmbë te telefoni, shtrirë te kompjuteri).
  const [ratio, setRatio] = React.useState<number | null>(null);

  // Pamja merr vetëm gjurmën e videos: zëri luan nga elementi i vet, dhe e njëjta
  // rrjedhë në dy elemente e ndalte zërin në iPhone sapo ndizej kamera.
  React.useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    const video = stream?.getVideoTracks() ?? [];
    element.srcObject = video.length > 0 ? new MediaStream(video) : null;
    if (video.length > 0) void element.play().catch(() => undefined);
  }, [stream, tracks]);

  React.useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    const measure = () => {
      if (element.videoWidth > 0 && element.videoHeight > 0) setRatio(element.videoWidth / element.videoHeight);
    };
    element.addEventListener("loadedmetadata", measure);
    element.addEventListener("resize", measure);
    return () => {
      element.removeEventListener("loadedmetadata", measure);
      element.removeEventListener("resize", measure);
    };
  }, []);

  // Gjurmët e reja (kamera që ndizet më vonë) vijnë te e njëjta rrjedhë.
  React.useEffect(() => {
    if (!stream) return;
    const bump = () => setTracks((value) => value + 1);
    stream.addEventListener("addtrack", bump);
    stream.addEventListener("removetrack", bump);
    return () => {
      stream.removeEventListener("addtrack", bump);
      stream.removeEventListener("removetrack", bump);
    };
  }, [stream]);

  // Kamera e tjetrit: e gjallë kur gjurma merr pamje; kur ai e fik, gjurma heshtet.
  React.useEffect(() => {
    if (!stream) {
      setShowVideo(false);
      return;
    }
    const videoTracks = stream.getVideoTracks();
    const update = () => {
      const track = stream.getVideoTracks()[0];
      setShowVideo(Boolean(track && track.readyState === "live" && !track.muted && track.enabled));
    };
    update();
    for (const track of videoTracks) {
      track.addEventListener("mute", update);
      track.addEventListener("unmute", update);
      track.addEventListener("ended", update);
    }
    return () => {
      for (const track of videoTracks) {
        track.removeEventListener("mute", update);
        track.removeEventListener("unmute", update);
        track.removeEventListener("ended", update);
      }
    };
  }, [stream, tracks]);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden border transition-shadow duration-150",
        variant === "pip" ? "rounded-control shadow-lifted" : "rounded-card",
        variant === "stage" && "size-full",
        variant === "grid" && "min-h-40",
        // Kamera e ndezur: sfond i errët, si te telefoni, që pamja e plotë të dallohet.
        showVideo ? "bg-story-glass" : "bg-surface-solid",
        variant === "pip" && !showVideo && "aspect-[3/4]",
        speaking ? "border-success shadow-[0_0_0_3px_var(--color-success)]" : "border-border",
      )}
      style={variant === "pip" && showVideo && ratio ? { aspectRatio: String(ratio) } : undefined}
      data-call-tile={local ? "me" : person.id}
      data-speaking={speaking ? "true" : undefined}
    >
      {/* Zëri i tjetrit luan nga elementi i fshehur i rrjetit; kjo pamje është pa zë. */}
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className={cn(
          "absolute inset-0 size-full",
          // E plotë, pa prerje: pamja del ashtu si e kap kamera e telefonit.
          variant === "pip" ? "object-cover" : "object-contain",
          mirrored && "-scale-x-100",
          !showVideo && "invisible",
        )}
      />
      {!showVideo ? <Avatar name={person.name} src={person.avatar} size={variant === "pip" ? "md" : "xl"} /> : null}
      <span className="absolute bottom-2 left-2 rounded-full bg-story-glass px-2.5 py-1 text-xs font-semibold text-story-ink backdrop-blur-[6px]">
        {local ? youLabel : person.name}
      </span>
    </div>
  );
}
