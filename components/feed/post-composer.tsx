"use client";

import { MentionSuggest } from "@/components/shared/mention-suggest";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BarChart3, Camera, ChevronDown, Globe, Images, Mic, Plus, Send, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { PaywallSheet, usePaywall } from "@/components/pro/paywall-sheet";
import { ScopeSelector } from "./scope-selector";
import { VoiceRoomForm } from "@/components/voice/voice-room-form";
import { createPost } from "@/lib/actions/posts";
import { CameraCapture, openDeviceCamera, prefersDeviceCamera } from "./camera-capture";
import type { ComposerAttachment } from "./composer-context";
import { MediaPicker, type MediaPickerHandle } from "./media-picker";
import { POST_TEXT_COUNTER_FROM, POST_TEXT_LIMIT } from "@/lib/constants";
import type { MediaRef } from "@/lib/media";
import type { PostScope } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ComposerCourse = { id: string; name: string; code: string };

/** Media nuk është më bashkëngjitje më vete: foto, video dhe kamera shtohen gjithmonë. */
type Attachment = "none" | "poll" | "voice";

function attachmentFrom(initial?: ComposerAttachment): Attachment {
  return initial === "poll" || initial === "voice" ? initial : "none";
}

export function PostComposer({
  open,
  onOpenChange,
  user,
  scopeOptions,
  initialAttachment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { name: string; avatar: string | null };
  scopeOptions: { scope: PostScope; allowed: boolean }[];
  /** Bashkëngjitja me të cilën hapet, kur nxitësi e di çfarë do studenti. */
  initialAttachment?: ComposerAttachment;
}) {
  const router = useRouter();
  const t = useTranslations("feed");
  const ta = useTranslations("access");
  const tc = useTranslations("common");
  const guard = useTranslations("guard");
  const errors = useTranslations("errors");
  const paywall = usePaywall();

  const [attachment, setAttachment] = React.useState<Attachment>("none");
  const [scope, setScope] = React.useState<PostScope>("faculty");
  const [text, setText] = React.useState("");
  const textRef = React.useRef<HTMLTextAreaElement>(null);
  const [media, setMedia] = React.useState<MediaRef[]>([]);
  const [pollOptions, setPollOptions] = React.useState<string[]>(["", ""]);
  const [showScope, setShowScope] = React.useState(false);
  const [confirmClose, setConfirmClose] = React.useState(false);
  const [cameraOpen, setCameraOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const pickerRef = React.useRef<MediaPickerHandle>(null);

  React.useEffect(() => {
    if (open) setAttachment(attachmentFrom(initialAttachment));
  }, [open, initialAttachment]);

  const hasContent = text.trim().length > 0 || media.length > 0;
  const canPost = text.trim().length >= 3 || media.length > 0;

  function reset() {
    setText("");
    setMedia([]);
    setPollOptions(["", ""]);
    setAttachment("none");
    setShowScope(false);
    setConfirmClose(false);
  }

  /**
   * Mbyllja.
   *
   * Bosh mbyllet menjëherë. Me tekst brenda pyet, sepse humbja e asaj që sapo
   * shkrove nga një klikim jashtë modalit është mënyra më e shpejtë për ta bërë
   * dikë të mos postojë më kurrë.
   */
  function requestClose(next: boolean) {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (!hasContent) {
      reset();
      onOpenChange(false);
      return;
    }
    setConfirmClose(true);
  }

  function submit() {
    startTransition(async () => {
      const result = await createPost({
        type: attachment === "poll" ? "poll" : "text",
        scope,
        text,
        media,
        pollOptions: attachment === "poll" ? pollOptions.filter(Boolean) : undefined,
      });

      if (!result.ok) {
        if (result.messageKey === "pro.lockedScopeTitle") {
          paywall.show({ kind: "scope", scope: ta(`scopes.${scope}`) });
          return;
        }
        toast.error(result.messageKey ? messageFor(result.messageKey) : tc("retry"));
        return;
      }

      toast.success(t("posted"));
      reset();
      onOpenChange(false);
      router.refresh();
    });
  }

  /** Çelësat e gabimit vijnë nga serveri si `namespace.key`. */
  function messageFor(key: string) {
    if (key.startsWith("guard.")) return guard(key.replace("guard.", ""));
    if (key.startsWith("errors.")) return errors(key.replace("errors.", ""));
    return tc("retry");
  }

  return (
    <>
      <CameraCapture
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={(file) => void pickerRef.current?.addFiles([file])}
      />

      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader className="border-b border-border/60 pb-3">
            <DialogTitle className="text-base font-semibold text-text">{t("compose")}</DialogTitle>
          </DialogHeader>

          <DialogBody className="flex flex-col gap-3 pt-3">
            <div className="relative flex items-start gap-3">
              <Avatar name={user.name} src={user.avatar} className="size-9" />
              <Textarea
                ref={textRef}
                autoGrow
                autoFocus
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  // Enter me Ctrl ose Cmd poston. Enter i thjeshtë shkon në rresht
                  // të ri, sepse një postim social shpesh ka më shumë se një rresht.
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && canPost) {
                    event.preventDefault();
                    submit();
                  }
                }}
                placeholder={t("composerPrompt")}
                className="min-h-24 border-0 bg-transparent px-0 text-base text-text placeholder:text-text-muted focus:ring-0"
                maxLength={POST_TEXT_LIMIT}
                aria-label={t("compose")}
              />
              {/* @ sugjeron njerëz; #hashtag-u bëhet lidhje vetë pas postimit. */}
              <MentionSuggest inputRef={textRef} value={text} onChange={setText} className="absolute left-12 top-full mt-1" />
            </div>

            {/* Fotot dhe videot e zgjedhura, me heqje. Nxitësit janë rreshti më poshtë. */}
            <MediaPicker ref={pickerRef} media={media} onChange={setMedia} hideAddButton />

            {attachment === "poll" ? (
              <PollFields options={pollOptions} onChange={setPollOptions} />
            ) : null}

            {attachment === "voice" ? (
              <VoiceRoomForm
                scope={scope}
                onCreated={() => {
                  reset();
                  onOpenChange(false);
                  router.refresh();
                }}
              />
            ) : null}

            {/* Katër bashkëngjitjet, të njëjta nga pamja: galeria, kamera, sondazhi, zëri. */}
            <div className="grid grid-cols-2 gap-2 border-t border-border pt-3" data-composer-media>
              <button
                type="button"
                onClick={() => pickerRef.current?.openFiles()}
                disabled={attachment === "voice"}
                className={MEDIA_BUTTON}
              >
                <span className="grid size-8 place-items-center rounded-[10px] bg-cat-teal-bg text-cat-teal">
                  <Images className="size-[18px]" aria-hidden />
                </span>
                {t("shortcutMedia")}
              </button>

              <button
                type="button"
                onClick={() =>
                  prefersDeviceCamera()
                    ? openDeviceCamera((file) => void pickerRef.current?.addFiles([file]))
                    : setCameraOpen(true)
                }
                disabled={attachment === "voice"}
                className={MEDIA_BUTTON}
                data-composer-camera
              >
                <span className="grid size-8 place-items-center rounded-[10px] bg-cat-amber-bg text-cat-amber">
                  <Camera className="size-[18px]" aria-hidden />
                </span>
                {t("shortcutCamera")}
              </button>

              <button
                type="button"
                aria-pressed={attachment === "poll"}
                onClick={() => setAttachment(attachment === "poll" ? "none" : "poll")}
                className={cn(MEDIA_BUTTON, attachment === "poll" && ACTIVE_BUTTON)}
              >
                <span className="grid size-8 place-items-center rounded-[10px] bg-warning-50 text-warning-text">
                  <BarChart3 className="size-[18px]" aria-hidden />
                </span>
                {t("shortcutPoll")}
              </button>

              <button
                type="button"
                aria-pressed={attachment === "voice"}
                onClick={() => setAttachment(attachment === "voice" ? "none" : "voice")}
                className={cn(MEDIA_BUTTON, attachment === "voice" && ACTIVE_BUTTON)}
              >
                <span className="grid size-8 place-items-center rounded-[10px] bg-cat-violet-bg text-cat-violet">
                  <Mic className="size-[18px]" aria-hidden />
                </span>
                {t("shortcutVoice")}
              </button>
            </div>

            {attachment !== "voice" ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/*
                  Shtrirja është vendim i dytë, jo i pari. Studenti shkruan së pari
                  dhe pastaj vendos kush e sheh, jo e kundërta.
                */}
                <button
                  type="button"
                  onClick={() => setShowScope((value) => !value)}
                  aria-expanded={showScope}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface-2/60 px-2.5 py-1.5",
                    "text-xs font-medium text-text-muted",
                    "transition-all duration-150 ease-brand hover:border-brand-500/30 hover:bg-surface hover:text-text",
                    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500",
                  )}
                >
                  <Globe className="size-3.5 text-brand-500" aria-hidden />
                  <span>{ta(`scopes.${scope}`)}</span>
                  <ChevronDown
                    className={cn("size-3.5 transition-transform duration-150", showScope && "rotate-180")}
                    aria-hidden
                  />
                </button>

                {text.length >= POST_TEXT_COUNTER_FROM ? (
                  <span
                    className={cn(
                      "tabular text-xs",
                      text.length >= POST_TEXT_LIMIT ? "text-danger-text font-semibold" : "text-text-muted",
                    )}
                  >
                    {text.length} / {POST_TEXT_LIMIT}
                  </span>
                ) : null}

                <Button
                  onClick={submit}
                  loading={pending}
                  disabled={!canPost}
                  className="ml-auto rounded-full px-5 shadow-none hover:shadow-cta"
                  data-composer-post
                >
                  <Send />
                  {t("post")}
                </Button>
              </div>
            ) : null}

            {showScope && attachment !== "voice" ? (
              <ScopeSelector
                value={scope}
                options={scopeOptions}
                onChange={(next) => {
                  setScope(next);
                  setShowScope(false);
                }}
                onLocked={(locked) => paywall.show({ kind: "scope", scope: ta(`scopes.${locked}`) })}
              />
            ) : null}
          </DialogBody>
          {/*
            Konfirmimi rri brenda dritares: jashtë saj, dritarja modale e bën
            pjesën tjetër të faqes të paklikueshme dhe të padukshme për lexuesit e ekranit.
          */}
          {confirmClose ? (
            <div
              role="alertdialog"
              aria-modal="true"
              aria-label={t("discardTitle")}
              className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-bg/80 p-4 backdrop-blur-sm"
            >
              <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg border border-border bg-surface-solid p-5 shadow-lifted">
                <h2 className="text-base font-semibold text-text">{t("discardTitle")}</h2>
                <p className="measure text-sm text-text-muted">{t("discardBody")}</p>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="ghost" size="sm" autoFocus onClick={() => setConfirmClose(false)}>
                    {t("keepWriting")}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      reset();
                      onOpenChange(false);
                    }}
                  >
                    {t("discard")}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>


      <PaywallSheet open={paywall.open} onOpenChange={paywall.setOpen} context={paywall.context} />
    </>
  );
}

const MEDIA_BUTTON = cn(
  "flex h-12 items-center justify-center gap-2.5 rounded-control border border-border bg-surface-2 px-3",
  "text-sm font-semibold text-text transition-[background-color,border-color,transform,opacity] duration-200 ease-out",
  "hover:-translate-y-px hover:border-border-strong disabled:pointer-events-none disabled:opacity-40",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
);

/** Sondazhi ose zëri i zgjedhur: kufiri i markës, që të dihet çfarë është hapur. */
const ACTIVE_BUTTON = "border-brand-500/60 bg-brand-50";

/** Sondazhi: pyetja është teksti i postimit, këtu rrinë vetëm alternativat. */
function PollFields({
  options,
  onChange,
}: {
  options: string[];
  onChange: (next: string[]) => void;
}) {
  const t = useTranslations("feed");
  const tc = useTranslations("common");

  return (
    <div className="flex flex-col gap-2">
      {options.map((option, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={option}
            maxLength={80}
            placeholder={t("pollOption", { index: index + 1 })}
            aria-label={t("pollOption", { index: index + 1 })}
            onChange={(event) =>
              onChange(options.map((item, position) => (position === index ? event.target.value : item)))
            }
          />
          {options.length > 2 ? (
            <Button
              size="icon"
              variant="ghost"
              aria-label={tc("delete")}
              onClick={() => onChange(options.filter((_, position) => position !== index))}
            >
              <X />
            </Button>
          ) : null}
        </div>
      ))}

      {options.length < 4 ? (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => onChange([...options, ""])}>
          <Plus />
          {t("pollAddOption")}
        </Button>
      ) : null}
    </div>
  );
}
