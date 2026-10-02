"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Camera, RefreshCcw, RotateCcw, Square, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDuration, MAX_VIDEO_SECONDS } from "@/lib/media";
import { cn } from "@/lib/utils";

type Mode = "photo" | "video";
type Facing = "user" | "environment";
type Shot = { file: File; url: string; kind: Mode };

type Phase =
  | { name: "starting" }
  | { name: "live" }
  | { name: "recording"; startedAt: number }
  | { name: "review"; shot: Shot }
  | { name: "blocked" };

/** Kontejneri i videos që shfletuesi di ta regjistrojë, sipas radhës së preferencës. */
function pickVideoMime() {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

/**
 * Telefoni dhe tableti kanë aplikacionin e vet të kamerës, më të mirë se çdo
 * pamje brenda faqes: atje «Bëj foto» e hap drejt atë, pa dritare tjetër.
 */
export function prefersDeviceCamera() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(pointer: fine)").matches;
}

/**
 * Hap kamerën e pajisjes. Thirret drejt nga prekja e studentit: shfletuesi
 * lejon hapjen e kamerës vetëm brenda asaj prekjeje.
 */
export function openDeviceCamera(onCapture: (file: File) => void, accept = "image/*,video/*") {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.setAttribute("capture", "environment");
  input.style.display = "none";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) onCapture(file);
    input.remove();
  });
  document.body.appendChild(input);
  input.click();
}

/**
 * Kamera e drejtpërdrejtë për postimin.
 *
 * Hap kamerën e pajisjes me `getUserMedia`: pamje e gjallë, foto me një prekje,
 * video deri në {@link MAX_VIDEO_SECONDS} sekonda, pastaj rishikim para se të hyjë te
 * postimi. Kur shfletuesi nuk e lejon (leje e refuzuar, lidhje pa HTTPS, asnjë
 * kamerë), kalon te kamera vendase e pajisjes përmes `capture`.
 */
export function CameraCapture({
  open,
  onOpenChange,
  onCapture,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
}) {
  const t = useTranslations("feed");
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const fallbackRef = React.useRef<HTMLInputElement>(null);

  const [mode, setMode] = React.useState<Mode>("photo");
  const [facing, setFacing] = React.useState<Facing>("environment");
  const [canFlip, setCanFlip] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>({ name: "starting" });
  const [elapsed, setElapsed] = React.useState(0);

  const stopStream = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  // Pamja e gjallë ndizet sa herë hapet dritarja, ndërrohet kamera ose mënyra.
  // Zëri kërkohet vetëm për videon: fotoja nuk ka pse të pyesë për mikrofonin.
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function start() {
      setPhase({ name: "starting" });
      stopStream();

      if (!navigator.mediaDevices?.getUserMedia) {
        setPhase({ name: "blocked" });
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: mode === "video",
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        if (!cancelled) {
          setCanFlip(devices.filter((device) => device.kind === "videoinput").length > 1);
          setPhase({ name: "live" });
        }
      } catch {
        if (!cancelled) setPhase({ name: "blocked" });
      }
    }

    void start();
    return () => {
      cancelled = true;
    };
  }, [open, facing, mode, stopStream]);

  // Kamera lirohet kur mbyllet dritarja, dhe drita e saj fiket menjëherë.
  React.useEffect(() => {
    if (open) return;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    stopStream();
  }, [open, stopStream]);

  React.useEffect(() => () => stopStream(), [stopStream]);

  // Numëruesi i regjistrimit, me ndalim automatik te kufiri i videos së postimit.
  React.useEffect(() => {
    if (phase.name !== "recording") return;
    const timer = window.setInterval(() => {
      const seconds = (Date.now() - phase.startedAt) / 1000;
      setElapsed(seconds);
      if (seconds >= MAX_VIDEO_SECONDS) stopRecording();
    }, 200);
    return () => window.clearInterval(timer);
  }, [phase]);

  function review(file: File, kind: Mode) {
    setPhase({ name: "review", shot: { file, url: URL.createObjectURL(file), kind } });
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    // Kamera e përparme shfaqet si pasqyrë; fotoja ruhet ashtu siç e sheh studenti.
    if (facing === "user") {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        review(new File([blob], `kamera-${stamp()}.jpg`, { type: "image/jpeg" }), "photo");
      },
      "image/jpeg",
      0.9,
    );
  }

  function startRecording() {
    const stream = streamRef.current;
    const mime = pickVideoMime();
    if (!stream || !mime) {
      setPhase({ name: "blocked" });
      return;
    }
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const type = mime.split(";")[0];
      const blob = new Blob(chunksRef.current, { type });
      if (blob.size === 0) return;
      review(new File([blob], `kamera-${stamp()}.${type === "video/mp4" ? "mp4" : "webm"}`, { type }), "video");
    };
    recorderRef.current = recorder;
    recorder.start(250);
    setElapsed(0);
    setPhase({ name: "recording", startedAt: Date.now() });
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function retake() {
    if (phase.name === "review") URL.revokeObjectURL(phase.shot.url);
    setPhase({ name: "live" });
  }

  function use() {
    if (phase.name !== "review") return;
    onCapture(phase.shot.file);
    URL.revokeObjectURL(phase.shot.url);
    onOpenChange(false);
  }

  const live = phase.name === "live" || phase.name === "recording";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden p-0" data-camera>
        <DialogHeader className="px-5 pb-3 pt-4">
          <DialogTitle className="text-base font-semibold text-text">{t("cameraTitle")}</DialogTitle>
          <DialogDescription className="sr-only">{t("cameraDescription")}</DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4 px-5 pb-5 pt-0">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[18px] bg-black">
            {/* Pamja e gjallë rri gjithmonë në DOM, që `srcObject` të mos humbasë mes gjendjeve. */}
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className={cn(
                "absolute inset-0 size-full object-cover",
                facing === "user" && "-scale-x-100",
                !live && "invisible",
              )}
            />

            {phase.name === "starting" ? <div className="shimmer absolute inset-0" aria-hidden /> : null}

            {phase.name === "review" ? (
              phase.shot.kind === "photo" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={phase.shot.url} alt={t("cameraPreview")} className="absolute inset-0 size-full object-contain" />
              ) : (
                <video src={phase.shot.url} controls playsInline className="absolute inset-0 size-full object-contain" />
              )
            ) : null}

            {phase.name === "blocked" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <Camera className="size-8 text-text-muted" aria-hidden />
                <p className="measure text-sm text-text-muted">{t("cameraBlocked")}</p>
                <Button variant="secondary" size="sm" onClick={() => fallbackRef.current?.click()}>
                  {t("cameraDevice")}
                </Button>
              </div>
            ) : null}

            {phase.name === "recording" ? (
              <span className="tabular absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-story-glass px-2.5 py-1 text-xs font-semibold text-story-ink backdrop-blur-[6px]">
                <span className="size-2 animate-pulse rounded-full bg-like" aria-hidden />
                {formatDuration(elapsed * 1000)} / {formatDuration(MAX_VIDEO_SECONDS * 1000)}
              </span>
            ) : null}

            {canFlip && live && phase.name !== "recording" ? (
              <button
                type="button"
                onClick={() => setFacing((value) => (value === "user" ? "environment" : "user"))}
                aria-label={t("cameraFlip")}
                className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-story-glass text-story-ink backdrop-blur-[6px] transition-transform duration-150 hover:scale-105"
              >
                <RefreshCcw className="size-4" />
              </button>
            ) : null}
          </div>

          <input
            ref={fallbackRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                onCapture(file);
                onOpenChange(false);
              }
            }}
          />

          {phase.name === "review" ? (
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={retake}>
                <RotateCcw />
                {t("cameraRetake")}
              </Button>
              <Button onClick={use}>{t("cameraUse")}</Button>
            </div>
          ) : phase.name !== "blocked" ? (
            <div className="flex items-center gap-3">
              <div role="radiogroup" aria-label={t("cameraMode")} className="inline-flex rounded-full border border-border bg-surface-2 p-[3px]">
                {(["photo", "video"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={mode === value}
                    disabled={phase.name === "recording"}
                    onClick={() => setMode(value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-150",
                      mode === value ? "bg-tab-active text-on-tab-active" : "text-text-muted hover:text-text",
                    )}
                  >
                    {value === "photo" ? <Camera className="size-3.5" /> : <Video className="size-3.5" />}
                    {value === "photo" ? t("cameraPhoto") : t("cameraVideo")}
                  </button>
                ))}
              </div>

              {/* Këmbëza: rreth i madh, si te kamera e telefonit. */}
              <button
                type="button"
                disabled={!live}
                onClick={() => {
                  if (mode === "photo") takePhoto();
                  else if (phase.name === "recording") stopRecording();
                  else startRecording();
                }}
                aria-label={
                  mode === "photo" ? t("cameraShoot") : phase.name === "recording" ? t("cameraStop") : t("cameraRecord")
                }
                data-camera-shutter
                className={cn(
                  "mx-auto grid size-16 place-items-center rounded-full border-4 border-border-strong transition-transform duration-150 active:scale-95 disabled:opacity-40",
                  mode === "photo" ? "bg-primary" : "bg-like",
                )}
              >
                {phase.name === "recording" ? <Square className="size-5 fill-current text-bg" /> : null}
              </button>

              <span className="w-[140px]" aria-hidden />
            </div>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
