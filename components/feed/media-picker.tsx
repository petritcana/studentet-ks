"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { FileText, ImagePlus, Video, X } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { shrinkImage } from "@/lib/shrink-image";
import { uploadFile } from "@/lib/upload-client";
import {
  DOCUMENT_ACCEPT,
  formatBytes,
  formatDuration,
  IMAGE_TYPES,
  MAX_POST_IMAGES,
  VIDEO_TYPES,
  type MediaRef,
} from "@/lib/media";
import { cn } from "@/lib/utils";

// Çdo foto: ato që serveri nuk i pranon siç janë i kthen shfletuesi (`shrinkImage`).
const ACCEPT = ["image/*", ...Object.keys(IMAGE_TYPES), ...Object.keys(VIDEO_TYPES)].join(",");

/** Kontrolli nga jashtë: kompozuesi hap galerinë ose i jep pamjen e kamerës. */
export type MediaPickerHandle = {
  /** Hap zgjedhjen e skedarëve. Thirret brenda klikimit, që shfletuesi ta lejojë. */
  openFiles: () => void;
  /** Hap zgjedhjen e dokumenteve (PDF, Word, Excel...). Vetëm kur `documents` është ndezur. */
  openDocuments: () => void;
  /** Ngarkon skedarë të gatshëm, p.sh. një foto nga kamera. */
  addFiles: (files: File[]) => Promise<void>;
};

/** Zgjedhja e fotove dhe videove për një postim ose story. */
export const MediaPicker = React.forwardRef<
  MediaPickerHandle,
  {
    media: MediaRef[];
    onChange: (next: MediaRef[]) => void;
    surface?: "post" | "story" | "message";
    max?: number;
    /** Te biseda: pranon edhe dokumente, që dalin si kartë me emër. */
    documents?: boolean;
    /** Pa butonin e vet, kur nxitësit rrinë jashtë (kompozuesi i postimit). */
    hideAddButton?: boolean;
  }
>(function MediaPicker(
  { media, onChange, surface = "post", max = MAX_POST_IMAGES, hideAddButton = false, documents = false },
  ref,
) {
  const t = useTranslations("feed");
  const errors = useTranslations("errors");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const documentRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(0);

  async function handleFiles(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;

    const room = max - media.length;
    if (room <= 0) {
      toast.error(t("mediaFull", { count: max }));
      return;
    }

    const chosen = [...files].slice(0, room);
    setBusy((count) => count + chosen.length);

    // Grumbullimi behet këtu, jo te gjendja: `media` e prop-it mbetet e vjeter
    // gjatë tere ciklit, prandaj shtimi një nga një do ta mbishkruante secilen
    // foto me tjetren dhe vetëm e fundit do te mbetej.
    const added: MediaRef[] = [];

    for (const original of chosen) {
      try {
        // Fotoja e rëndë e telefonit zvogëlohet këtu, që ngarkimi të jetë i shpejtë.
        // Dokumentet shkojnë siç janë: nuk kanë përmasa as kohëzgjatje.
        const isMedia = original.type.startsWith("image/") || original.type.startsWith("video/");
        const file = isMedia ? await shrinkImage(original) : original;
        const probe = isMedia ? await probeFile(file) : { width: null, height: null, duration: null };

        // Skedari shkon me copa: kufiri i trupit te server actions ndalonte çdo
        // foto mbi një megabajt, dhe pikërisht kjo i prishte ngarkimet.
        const result = await uploadFile(file, {
          surface,
          durationSeconds: probe.duration,
          width: probe.width,
          height: probe.height,
        });

        if (!result.ok) {
          const key = result.errorKey.replace("errors.", "");
          toast.error(errors(key, { seconds: 30 }));
          continue;
        }

        added.push(result.media);
        onChange([...media, ...added].slice(0, max));
      } catch {
        toast.error(errors("generic"));
      } finally {
        setBusy((count) => count - 1);
      }
    }

    if (inputRef.current) inputRef.current.value = "";
    if (documentRef.current) documentRef.current.value = "";
  }

  React.useImperativeHandle(ref, () => ({
    openFiles: () => {
      if (media.length >= max) {
        toast.error(t("mediaFull", { count: max }));
        return;
      }
      inputRef.current?.click();
    },
    openDocuments: () => {
      if (media.length >= max) {
        toast.error(t("mediaFull", { count: max }));
        return;
      }
      documentRef.current?.click();
    },
    addFiles: (files) => handleFiles(files),
  }));

  return (
    <div className="flex flex-col gap-2">
      {media.length > 0 || busy > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {media.map((item) => (
            <li
              key={item.id}
              className={cn(
                "relative overflow-hidden rounded-md border border-border bg-surface-2",
                item.kind === "file" ? "flex h-20 w-48 items-center gap-2 px-3 pr-7" : "size-20",
              )}
              data-attachment={item.kind}
            >
              {item.kind === "file" ? (
                <>
                  <FileText className="size-6 shrink-0 text-brand-500" aria-hidden />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-semibold text-text">{item.name}</span>
                    <span className="text-[10px] uppercase text-text-muted">
                      {item.extension} · {formatBytes(item.bytes ?? 0)}
                    </span>
                  </span>
                </>
              ) : item.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/media/${item.id}`}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="grid size-full place-items-center text-text-muted">
                  <Video className="size-6" aria-hidden />
                  {item.durationMs ? (
                    <span className="tabular absolute bottom-1 right-1 rounded-sm bg-bg/80 px-1 text-[10px] text-text">
                      {formatDuration(item.durationMs)}
                    </span>
                  ) : null}
                </span>
              )}

              <button
                type="button"
                onClick={() => onChange(media.filter((entry) => entry.id !== item.id))}
                aria-label={t("mediaRemove")}
                className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-bg/85 text-text transition-colors duration-150 hover:bg-bg"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}

          {busy > 0
            ? Array.from({ length: busy }, (_, index) => (
                <li
                  key={`busy-${index}`}
                  className="shimmer size-20 rounded-md border border-dashed border-border"
                >
                  <span className="sr-only">{t("mediaUploading")}</span>
                </li>
              ))
            : null}
        </ul>
      ) : null}

      <div className={cn(hideAddButton && "contents")}>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple={max > 1}
          className="sr-only"
          onChange={(event) => void handleFiles(event.target.files)}
        />
        {documents ? (
          <input
            ref={documentRef}
            type="file"
            accept={DOCUMENT_ACCEPT}
            multiple={max > 1}
            className="sr-only"
            onChange={(event) => void handleFiles(event.target.files)}
            data-document-input
          />
        ) : null}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={media.length >= max}
          hidden={hideAddButton}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5",
            "text-xs font-medium text-text-muted",
            "transition-colors duration-150 ease-brand hover:text-text",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
          )}
        >
          <ImagePlus className="size-4" aria-hidden />
          {t("mediaAdd")}
        </button>
      </div>
    </div>
  );
});

/**
 * Përmasat dhe kohëzgjatja, para dërgimit.
 *
 * Nëse shfletuesi nuk e lexon dot skedarin, kthehen null-a dhe ngarkimi vazhdon:
 * një metadatë që mungon nuk është arsye për ta bllokuar një foto të rregullt.
 */
function probeFile(file: File): Promise<{
  width: number | null;
  height: number | null;
  duration: number | null;
}> {
  type Probe = { width: number | null; height: number | null; duration: number | null };
  const empty: Probe = { width: null, height: null, duration: null };

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const done = (value: Probe) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };

    // Një skedar i demtuar nuk duhet ta ngrije kompozuesin.
    const timer = window.setTimeout(() => done(empty), 5000);

    if (file.type.startsWith("image/")) {
      const image = new Image();
      image.onload = () => {
        window.clearTimeout(timer);
        done({ width: image.naturalWidth, height: image.naturalHeight, duration: null });
      };
      image.onerror = () => {
        window.clearTimeout(timer);
        done(empty);
      };
      image.src = url;
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.clearTimeout(timer);
      done({
        width: video.videoWidth || null,
        height: video.videoHeight || null,
        duration: Number.isFinite(video.duration) ? video.duration : null,
      });
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      done(empty);
    };
    video.src = url;
  });
}
