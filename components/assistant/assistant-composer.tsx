"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { uploadFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { prepareImage } from "./prepare-image";
import type { PendingImage } from "./types";

/** Sa imazhe për pyetje. I njëjti kufi si te serveri (`MAX_AI_IMAGES`). */
const MAX_IMAGES = 3;

/**
 * Kutia e shkrimit: teksti, imazhet dhe dërgimi.
 *
 * Imazhi ngarkohet sapo zgjidhet, jo kur shtypet dërgimi, që pyetja të niset pa
 * pritje. Parapamja del menjëherë nga shfletuesi, dhe një imazh i hequr para
 * dërgimit nuk shkon kurrë te modeli.
 */
export function AssistantComposer({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (question: string, images: { id: string; preview: string }[]) => unknown;
}) {
  const t = useTranslations("assistantDock");
  const ta = useTranslations("assistant");
  const [question, setQuestion] = React.useState("");
  const [images, setImages] = React.useState<PendingImage[]>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const boxRef = React.useRef<HTMLTextAreaElement>(null);

  const uploading = images.some((image) => !image.id && !image.failed);
  const ready = images.filter((image) => image.id);
  const canSend = !disabled && !uploading && (question.trim().length >= 2 || ready.length > 0);

  // Kutia rritet me tekstin, deri në gjashtë rreshta.
  React.useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${Math.min(box.scrollHeight, 150)}px`;
  }, [question]);

  async function add(files: File[]) {
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast(t("imageLimit", { count: MAX_IMAGES }));
      return;
    }

    for (const original of files.slice(0, room)) {
      const file = await prepareImage(original);
      if (!file) {
        toast.error(t("imageType"));
        continue;
      }

      const key = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const preview = URL.createObjectURL(file);
      setImages((current) => [...current, { key, preview, id: null, progress: 0 }]);

      const outcome = await uploadFile(file, {
        surface: "ai",
        onProgress: (progress) =>
          setImages((current) => current.map((item) => (item.key === key ? { ...item, progress } : item))),
      });

      setImages((current) =>
        current.map((item) =>
          item.key === key
            ? outcome.ok
              ? { ...item, id: outcome.media.id, progress: 100 }
              : { ...item, failed: true }
            : item,
        ),
      );
      if (!outcome.ok) toast.error(t("imageFailed"));
    }
  }

  function remove(key: string) {
    setImages((current) => current.filter((item) => item.key !== key));
  }

  function send() {
    if (!canSend) return;
    void onSend(
      question.trim(),
      ready.map((image) => ({ id: image.id as string, preview: image.preview })),
    );
    setQuestion("");
    setImages([]);
    boxRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-2">
      {images.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto scrollbar-none" aria-label={t("imagePreview")}>
          {images.map((image) => (
            <div
              key={image.key}
              data-ai-image
              className={cn(
                "animate-rise relative size-16 shrink-0 overflow-hidden rounded-lg border",
                image.failed ? "border-danger-text" : "border-border",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.preview} alt="" className="size-full object-cover" />
              {!image.id && !image.failed ? (
                <span
                  className="absolute inset-x-0 bottom-0 h-1 bg-brand-500 transition-[width] duration-150"
                  style={{ width: `${Math.max(8, image.progress)}%` }}
                  aria-hidden
                />
              ) : null}
              <button
                type="button"
                onClick={() => remove(image.key)}
                aria-label={t("removeImage")}
                className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/60 text-white transition-transform duration-150 hover:scale-110"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-1.5 rounded-2xl border border-border bg-surface-2 p-1.5 transition-colors duration-150 focus-within:border-brand-500/60">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
          multiple
          hidden
          data-ai-file
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (files.length) void add(files);
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || images.length >= MAX_IMAGES}
          aria-label={t("addImage")}
          title={t("addImage")}
          className="grid size-9 shrink-0 place-items-center rounded-xl text-text-muted transition-colors duration-150 hover:bg-surface hover:text-text disabled:opacity-40"
        >
          <ImagePlus className="size-4" />
        </button>

        <textarea
          ref={boxRef}
          rows={1}
          value={question}
          maxLength={4000}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send();
            }
          }}
          onPaste={(event) => {
            // Një foto e ngjitur (screenshot) shkon drejt si imazh.
            const pasted = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
            if (pasted.length) {
              event.preventDefault();
              void add(pasted);
            }
          }}
          placeholder={t("placeholder")}
          aria-label={ta("placeholder")}
          className="max-h-[150px] min-h-9 flex-1 resize-none bg-transparent px-1.5 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none"
        />

        <Button
          size="icon"
          onClick={send}
          disabled={!canSend}
          aria-label={ta("send")}
          className="size-9 shrink-0 rounded-xl"
        >
          <Send />
        </Button>
      </div>
    </div>
  );
}
