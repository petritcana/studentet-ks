"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Mic, Pause, Play, Send, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { formatDuration, MAX_VOICE_SECONDS, type MediaRef } from "@/lib/media";
import { uploadFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";

/** Sa shtylla ka vala e drejtpërdrejtë. Mjafton për ritmin e zërit, pa e mbushur rreshtin. */
const BARS = 28;

/** Formati që e luajnë të gjithë: WebM me Opus te Chrome dhe Firefox, MP4 te Safari. */
function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

type State =
  | { phase: "idle" }
  | { phase: "preparing" }
  | { phase: "recording" }
  | { phase: "review"; file: File; url: string; seconds: number }
  | { phase: "sending" };

/** Kontrolli nga jashtë: menyja «+» e nis regjistrimin pa butonin e mikrofonit. */
export type VoiceRecorderHandle = { start: () => void };

/**
 * Mesazhi i zërit.
 *
 * Prekja e nis. «Ndalo» e ndal dhe e lë për ta dëgjuar, pastaj Enter ose shigjeta
 * e dërgon; koshi e hedh në çdo çast. Shigjeta gjatë regjistrimit e dërgon
 * menjëherë, për kush nuk do ta dëgjojë. Kohëmatësi dhe vala tregojnë që
 * mikrofoni po dëgjon vërtet. Në dy minuta ndalet vetë dhe pret dëgjimin.
 */
export const VoiceRecorder = React.forwardRef<
  VoiceRecorderHandle,
  {
    disabled?: boolean;
    /** Butoni i mikrofonit në pushim. Fshihet kur fusha ka tekst, por regjistrimi mund të niset nga menyja. */
    showButton?: boolean;
    onRecordingChange?: (recording: boolean) => void;
    onSend: (media: MediaRef) => Promise<boolean>;
    /** Forma e butonit në pushim, p.sh. i rrumbullakët brenda fushës së bisedës. */
    buttonClassName?: string;
  }
>(function VoiceRecorder({ disabled = false, showButton = true, onRecordingChange, onSend, buttonClassName }, ref) {
  const t = useTranslations("messages");
  const errors = useTranslations("errors");
  const [state, setState] = React.useState<State>({ phase: "idle" });
  const [elapsed, setElapsed] = React.useState(0);
  const [levels, setLevels] = React.useState<number[]>(() => Array(BARS).fill(0));

  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const frameRef = React.useRef<number | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const discardRef = React.useRef(false);
  const sendOnStopRef = React.useRef(false);
  const startedRef = React.useRef(0);
  const sendButtonRef = React.useRef<HTMLButtonElement>(null);
  // Në telefon mikrofoni mbahet i shtypur: `holding` tregon që gishti është ende aty.
  const [holding, setHolding] = React.useState(false);
  const touchRef = React.useRef(false);
  const phaseRef = React.useRef<State["phase"]>("idle");

  const recording = state.phase === "recording";

  React.useEffect(() => {
    phaseRef.current = state.phase;
  }, [state.phase]);

  React.useEffect(() => {
    onRecordingChange?.(state.phase !== "idle");
  }, [state.phase, onRecordingChange]);

  const release = React.useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
  }, []);

  // Mikrofoni lirohet edhe kur studenti largohet nga biseda gjatë regjistrimit.
  React.useEffect(() => () => {
    discardRef.current = true;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    release();
  }, [release]);

  // Adresa e dëgjimit lirohet kur regjistrimi dërgohet ose hidhet.
  const reviewUrl = state.phase === "review" ? state.url : null;
  React.useEffect(() => {
    if (!reviewUrl) return;
    return () => URL.revokeObjectURL(reviewUrl);
  }, [reviewUrl]);

  // Pas ndalimit, Enter e dërgon: fokusi shkon te shigjeta.
  React.useEffect(() => {
    if (state.phase === "review") sendButtonRef.current?.focus();
  }, [state.phase]);

  React.useImperativeHandle(ref, () => ({ start: () => void start() }));

  async function start() {
    if (state.phase !== "idle") return;
    const mime = pickMime();
    if (mime === null || !navigator.mediaDevices?.getUserMedia) {
      toast.error(t("voiceUnsupported"));
      return;
    }

    // Mikrofoni i parë mund të zgjasë disa sekonda të hapet: shiriti del menjëherë,
    // që prekja të mos duket e humbur.
    discardRef.current = false;
    sendOnStopRef.current = false;
    setState({ phase: "preparing" });

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error(t("voiceDenied"));
      reset();
      return;
    }

    // Studenti e anuloi ndërsa mikrofoni po hapej.
    if (discardRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => void finish(recorder.mimeType || mime || "audio/webm");
    recorder.start(250);

    startedRef.current = performance.now();
    setElapsed(0);
    setState({ phase: "recording" });
    listen(stream);
  }

  /** Vala dhe kohëmatësi, nga i njëjti cikël, që të mos ketë dy orë që ecin ndryshe. */
  function listen(stream: MediaStream) {
    const context = new AudioContext();
    audioContextRef.current = context;
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    context.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let last = 0;

    const tick = (now: number) => {
      const seconds = (now - startedRef.current) / 1000;
      if (now - last > 90) {
        last = now;
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const value of data) peak = Math.max(peak, Math.abs(value - 128));
        const level = Math.min(1, peak / 64);
        setLevels((current) => [...current.slice(1), level]);
        setElapsed(seconds);
      }
      if (seconds >= MAX_VOICE_SECONDS) {
        stop({ send: false });
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }

  /** Ndalon regjistrimin: ose për ta dëgjuar, ose për ta dërguar menjëherë. */
  function stop({ send }: { send: boolean }) {
    discardRef.current = false;
    sendOnStopRef.current = send;
    if (send) setState({ phase: "sending" });
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    release();
  }

  function discard() {
    discardRef.current = true;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    release();
    reset();
  }

  /*
    Telefoni: prekja e mbajtur nis regjistrimin, lëshimi e ndal dhe e lë për ta
    dëgjuar e dërguar. Butoni zhduket sapo nis regjistrimi, prandaj lëshimi dëgjohet
    te dritarja. Lëshimi para se mikrofoni të hapet quhet prekje e shpejtë: hidhet
    dhe thuhet që duhet mbajtur.
  */
  function beginHold() {
    touchRef.current = true;
    setHolding(true);
    const end = () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      setHolding(false);
      if (phaseRef.current === "recording") {
        stop({ send: false });
      } else if (phaseRef.current === "preparing") {
        toast(t("voiceHoldHint"));
        discard();
      }
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    void start();
  }

  function reset() {
    setState({ phase: "idle" });
    setElapsed(0);
    setLevels(Array(BARS).fill(0));
  }

  function finish(mime: string) {
    if (discardRef.current) return;

    const seconds = Math.min(MAX_VOICE_SECONDS, (performance.now() - startedRef.current) / 1000);
    // Një prekje e shpejtë nuk është mesazh: nën një sekondë hidhet pa zhurmë.
    if (seconds < 1 || chunksRef.current.length === 0) {
      toast(t("voiceTooShort"));
      reset();
      return;
    }

    const type = mime.split(";")[0] || "audio/webm";
    const extension = type.includes("mp4") ? "m4a" : "webm";
    const file = new File(chunksRef.current, `ze.${extension}`, { type });

    if (sendOnStopRef.current) {
      void upload(file, seconds);
      return;
    }
    setState({ phase: "review", file, url: URL.createObjectURL(file), seconds });
  }

  async function upload(file: File, seconds: number) {
    setState({ phase: "sending" });
    const outcome = await uploadFile(file, { surface: "voice", durationSeconds: seconds });
    if (!outcome.ok) {
      const key = outcome.errorKey.startsWith("errors.") ? outcome.errorKey.slice(7) : "generic";
      toast.error(errors(key));
      reset();
      return;
    }
    await onSend(outcome.media);
    reset();
  }

  if (state.phase === "idle") {
    if (!showButton) return null;
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        // Kompjuteri: një klikim e nis, ■ e ndal. Telefoni: mbaje të shtypur, lësho për ta ndalur.
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" || disabled) return;
          event.preventDefault();
          beginHold();
        }}
        onClick={() => {
          if (touchRef.current) {
            touchRef.current = false;
            return;
          }
          void start();
        }}
        onContextMenu={(event) => event.preventDefault()}
        disabled={disabled}
        aria-label={t("voiceRecord")}
        title={t("voiceRecordHint")}
        className={cn("shrink-0 touch-none select-none [-webkit-touch-callout:none]", buttonClassName)}
        data-voice-record
      >
        <Mic />
      </Button>
    );
  }

  return (
    <div
      className="animate-rise flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border bg-surface-2 px-2"
      role="status"
      aria-live="polite"
      data-voice-recording
      data-phase={state.phase}
      onKeyDown={(event) => {
        if (event.key === "Escape") discard();
      }}
    >
      <Button
        type="button"
        variant="ghost"
        size="iconSm"
        onClick={discard}
        disabled={state.phase === "sending"}
        aria-label={t("voiceDiscard")}
        data-voice-discard
      >
        <Trash2 />
      </Button>

      {state.phase === "review" ? (
        <ReviewPlayer url={state.url} seconds={state.seconds} />
      ) : (
        <>
          <span className="relative flex size-2.5 shrink-0" aria-hidden>
            {recording && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-60 motion-reduce:hidden" />
            )}
            <span className="relative inline-flex size-2.5 rounded-full bg-danger" />
          </span>

          <span className="tabular w-10 shrink-0 text-xs font-medium text-text">
            {formatDuration(elapsed * 1000)}
          </span>

          <span className="flex h-6 min-w-0 flex-1 items-center gap-[3px] overflow-hidden" aria-hidden>
            {levels.map((level, index) => (
              <span
                key={index}
                className="w-[3px] shrink-0 rounded-full bg-brand-500 transition-[height] duration-150"
                style={{ height: `${Math.max(12, level * 100)}%`, opacity: 0.35 + level * 0.65 }}
              />
            ))}
          </span>

          {recording && holding ? (
            <span className="shrink-0 text-xs font-medium text-text-muted" data-voice-holding>
              {t("voiceReleaseToStop")}
            </span>
          ) : recording ? (
            <Button
              type="button"
              variant="secondary"
              size="iconSm"
              onClick={() => stop({ send: false })}
              aria-label={t("voiceStop")}
              title={t("voiceStop")}
              data-voice-stop
            >
              <Square className="fill-current" />
            </Button>
          ) : null}
        </>
      )}

      <span className="sr-only">
        {state.phase === "preparing"
          ? t("voicePreparing")
          : recording
            ? t("voiceRecording")
            : state.phase === "review"
              ? t("voiceReview")
              : t("voiceSending")}
      </span>

      <Button
        ref={sendButtonRef}
        type="button"
        size="iconSm"
        onClick={() => (state.phase === "review" ? void upload(state.file, state.seconds) : stop({ send: true }))}
        disabled={state.phase === "preparing"}
        loading={state.phase === "sending"}
        aria-label={t("voiceSend")}
        data-voice-send
      >
        <Send />
      </Button>
    </div>
  );
});

/** Dëgjimi para dërgimit: luaj ose ndal, me kohën që ecën. */
function ReviewPlayer({ url, seconds }: { url: string; seconds: number }) {
  const t = useTranslations("messages");
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [current, setCurrent] = React.useState(0);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => toast.error(t("voiceFailed")));
    else audio.pause();
  }

  const ratio = seconds ? Math.min(1, current / seconds) : 0;

  return (
    <span className="flex min-w-0 flex-1 items-center gap-2" data-voice-review>
      <audio
        ref={audioRef}
        src={url}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t("voicePause") : t("voicePlay")}
        className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-500 text-brand-contrast"
        data-voice-review-play
      >
        {playing ? <Pause className="size-3.5 fill-current" /> : <Play className="ml-0.5 size-3.5 fill-current" />}
      </button>
      <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-text-muted/25">
        <span className="block h-full rounded-full bg-brand-500" style={{ width: `${ratio * 100}%` }} />
      </span>
      <span className="tabular w-10 shrink-0 text-right text-xs font-medium text-text">
        {formatDuration((playing || current > 0 ? current : seconds) * 1000)}
      </span>
    </span>
  );
}

/**
 * Luajtësi i zërit brenda flluskës.
 *
 * Shtyllat janë të qëndrueshme për çdo mesazh, nga id-ja e tij, që vala të mos
 * ndryshojë çdo herë që faqja rifreskohet. Kohëzgjatja vjen nga serveri, sepse
 * WebM-i i regjistruar nga shfletuesi shpesh e raporton si të pafundme.
 */
export function VoicePlayer({
  id,
  src,
  durationMs,
  mine,
}: {
  id: string;
  src: string;
  durationMs: number | null;
  mine: boolean;
}) {
  const t = useTranslations("messages");
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [current, setCurrent] = React.useState(0);
  const [rate, setRate] = React.useState(1);

  const total = (durationMs ?? 0) / 1000;
  const bars = React.useMemo(() => shapeFor(id, 32), [id]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      // Vetëm një zë luan njëherësh.
      document.querySelectorAll("audio[data-voice]").forEach((other) => {
        if (other !== audio) (other as HTMLAudioElement).pause();
      });
      void audio.play().catch(() => toast.error(t("voiceFailed")));
    } else {
      audio.pause();
    }
  }

  function seek(event: React.MouseEvent<HTMLButtonElement>) {
    const audio = audioRef.current;
    const length = Number.isFinite(audio?.duration) ? audio!.duration : total;
    if (!audio || !length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * length;
    setProgress(ratio);
  }

  return (
    <div className="flex w-60 max-w-full items-center gap-2.5 py-0.5" data-voice-player>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        data-voice
        onPlay={(event) => {
          event.currentTarget.playbackRate = rate;
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
          setCurrent(0);
        }}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          const length = Number.isFinite(audio.duration) ? audio.duration : total;
          setCurrent(audio.currentTime);
          setProgress(length ? Math.min(1, audio.currentTime / length) : 0);
        }}
      />

      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t("voicePause") : t("voicePlay")}
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full transition-transform duration-150 active:scale-95",
          mine ? "bg-white text-brand-600" : "bg-brand-500 text-brand-contrast",
        )}
      >
        {playing ? (
          <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden>
            <rect x="3" y="2" width="3.5" height="12" rx="1" />
            <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" className="ml-0.5 size-3.5" fill="currentColor" aria-hidden>
            <path d="M4 2.6v10.8a1 1 0 0 0 1.5.86l8.6-5.4a1 1 0 0 0 0-1.72L5.5 1.74A1 1 0 0 0 4 2.6Z" />
          </svg>
        )}
      </button>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <button
          type="button"
          onClick={seek}
          aria-label={t("voiceMessage")}
          className="flex h-7 w-full items-center gap-[2px]"
        >
          {bars.map((height, index) => {
            const filled = index / bars.length < progress;
            return (
              <span
                key={index}
                className={cn(
                  "w-full min-w-[2px] rounded-full transition-colors duration-150",
                  mine
                    ? filled
                      ? "bg-white"
                      : "bg-white/40"
                    : filled
                      ? "bg-brand-500"
                      : "bg-text-muted/35",
                )}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </button>
        <span
          className={cn(
            "tabular text-[10px]",
            mine ? "text-white/80" : "text-text-muted",
          )}
        >
          {formatDuration((playing || current > 0 ? current : total) * 1000)}
        </span>
      </span>

      {/* Shpejtësia: 1x ose 1.5x, për shënimet e gjata zanore. */}
      <button
        type="button"
        onClick={() => {
          const next = rate === 1 ? 1.5 : 1;
          setRate(next);
          if (audioRef.current) audioRef.current.playbackRate = next;
        }}
        aria-label={t("voiceSpeed", { rate: rate === 1 ? "1.5" : "1" })}
        aria-pressed={rate !== 1}
        className={cn(
          "tabular shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-colors",
          mine ? "bg-white/20 text-white hover:bg-white/30" : "bg-surface text-text-muted hover:text-text",
        )}
        data-voice-speed
      >
        {rate === 1 ? "1x" : "1.5x"}
      </button>
    </div>
  );
}

/** Forma e valës nga id-ja: e njëjta çdo herë, e ndryshme për çdo mesazh. */
function shapeFor(seed: string, count: number) {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return Array.from({ length: count }, (_, index) => {
    hash = Math.imul(hash ^ (index + 1), 16777619);
    const noise = ((hash >>> 0) % 1000) / 1000;
    // Mesi pak më i lartë se skajet, si një fjali e folur.
    const envelope = Math.sin(((index + 0.5) / count) * Math.PI) * 0.45 + 0.35;
    return Math.round(Math.max(18, Math.min(100, (envelope + noise * 0.45) * 100)));
  });
}
