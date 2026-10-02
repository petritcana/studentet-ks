"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, ImagePlus } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { toast } from "@/components/ui/toast";
import { shrinkImage } from "@/lib/shrink-image";
import { uploadFile } from "@/lib/upload-client";
import type { ArchiveStory } from "@/lib/queries/highlights";
import { cn } from "@/lib/utils";

/**
 * Fotoja e rrethit të një dosjeje storjesh.
 *
 * Pronari ngarkon një foto të re, ose prek një nga storjet e zgjedhura dhe ajo
 * bëhet foto e dosjes. Pa zgjedhje, rrethi merr storjen e parë.
 */
export function HighlightCoverPicker({
  value,
  onChange,
  stories,
  onBusyChange,
}: {
  /** Adresa e fotos së zgjedhur, ose null kur rrethi merr storjen e parë. */
  value: string | null;
  onChange: (next: string | null) => void;
  /** Storjet e zgjedhura në dosje, në rendin e tyre. */
  stories: ArchiveStory[];
  onBusyChange?: (busy: boolean) => void;
}) {
  const t = useTranslations("highlights");
  const tAll = useTranslations();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  // Fotoja e ngarkuar mbetet si zgjedhje edhe kur studenti prek një storje, që ta kthejë pa e ngarkuar prapë.
  const [uploaded, setUploaded] = React.useState<string | null>(
    value && !stories.some((story) => story.mediaUrl === value) ? value : null,
  );

  const images = stories.filter((story) => story.kind === "image");
  const current = value ?? images[0]?.mediaUrl ?? null;

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    onBusyChange?.(true);
    const result = await uploadFile(await shrinkImage(file), { surface: "post" });
    setUploading(false);
    onBusyChange?.(false);
    if (!result.ok) {
      toast.error(tAll(result.errorKey));
      return;
    }
    const url = `/api/media/${result.media.id}`;
    setUploaded(url);
    onChange(url);
  }

  const choices = [...(uploaded ? [uploaded] : []), ...images.map((story) => story.mediaUrl)];

  return (
    <div className="flex flex-col gap-2" data-highlight-cover>
      <p className="text-xs font-medium text-text-muted">{t("coverLabel")}</p>
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-1 pl-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-dashed border-border-strong text-text-muted transition-colors hover:border-brand-500 hover:text-text disabled:opacity-60"
          aria-label={t("coverUpload")}
          title={t("coverUpload")}
          data-highlight-cover-upload
        >
          {uploading ? <span className="size-full animate-pulse rounded-full bg-surface-2" /> : <ImagePlus className="size-5" />}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pick} />

        {choices.map((url) => {
          const chosen = url === current;
          return (
            <button
              key={url}
              type="button"
              onClick={() => onChange(url)}
              aria-pressed={chosen}
              aria-label={t("coverChoose")}
              className={cn(
                "relative size-14 shrink-0 overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-surface-solid transition-shadow duration-150",
                chosen ? "ring-brand-500" : "ring-transparent hover:ring-border-strong",
              )}
            >
              <MediaImage src={url} alt="" width={56} height={56} className="size-full object-cover" />
              {chosen ? (
                <span className="absolute inset-0 grid place-items-center bg-black/35 text-white">
                  <Check className="size-5" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-text-muted">{t("coverHint")}</p>
    </div>
  );
}
