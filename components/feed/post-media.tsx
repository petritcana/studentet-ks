"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { formatDuration, gridPlan, type MediaRef } from "@/lib/media";
import { cn } from "@/lib/utils";

export function PostMedia({ media }: { media: MediaRef[] }) {
  const t = useTranslations("feed");
  const [open, setOpen] = React.useState<number | null>(null);

  if (media.length === 0) return null;

  const { shown, remaining } = gridPlan(media.length);
  const visible = media.slice(0, shown);

  return (
    <>
      <div
        className={cn(
          "grid gap-2.5",
          visible.length === 1 && "grid-cols-1",
          visible.length === 2 && "grid-cols-2",
          visible.length === 3 && "grid-cols-2",
          visible.length >= 4 && "grid-cols-2",
        )}
      >
        {visible.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setOpen(index)}
            aria-label={item.kind === "video" ? t("mediaPlay") : t("mediaOpen")}
            className={cn(
              "group relative block overflow-hidden rounded-[18px] bg-surface-2",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
              // Tri foto: e para merr tërë kolonën e majtë.
              visible.length === 3 && index === 0 && "row-span-2",
              visible.length === 1 ? "max-h-[32rem]" : visible.length === 2 ? "h-[150px] sm:h-[170px]" : "aspect-square",
            )}
          >
            {item.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/media/${item.id}`}
                alt=""
                loading="lazy"
                decoding="async"
                className={cn(
                  "size-full transition-transform duration-250 ease-brand group-hover:scale-[1.02]",
                  visible.length === 1 ? "object-contain" : "object-cover",
                )}
              />
            ) : (
              <span className="grid size-full place-items-center bg-surface-2">
                <span className="grid size-12 place-items-center rounded-full bg-bg/70 text-text">
                  <Play className="size-5" aria-hidden />
                </span>
                {item.durationMs ? (
                  <span className="tabular absolute bottom-2 right-2 rounded-sm bg-bg/80 px-1.5 py-0.5 text-[11px] text-text">
                    {formatDuration(item.durationMs)}
                  </span>
                ) : null}
              </span>
            )}

            {remaining > 0 && index === visible.length - 1 ? (
              <span className="absolute inset-0 grid place-items-center bg-bg/65 text-lg font-semibold text-text">
                +{remaining}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {open !== null ? (
        <MediaLightbox media={media} index={open} onClose={() => setOpen(null)} />
      ) : null}
    </>
  );
}

/**
 * Pamja e plotë e një foto ose videoje.
 *
 * Mbetet mbi faqen, nuk e ndërron rrugën: studenti kthehet te i njëjti vend i
 * feed-it kur e mbyll. Tastiera lëviz majtas e djathtas dhe Escape mbyll, sepse
 * një pamje që merr tërë ekranin duhet të dijë të dalë.
 */
function MediaLightbox({
  media,
  index,
  onClose,
}: {
  media: MediaRef[];
  index: number;
  onClose: () => void;
}) {
  const t = useTranslations("feed");
  const tc = useTranslations("common");
  const [current, setCurrent] = React.useState(index);
  const touchStart = React.useRef<number | null>(null);

  const go = React.useCallback(
    (step: number) => {
      setCurrent((value) => (value + step + media.length) % media.length);
    },
    [media.length],
  );

  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    }

    document.addEventListener("keydown", onKey);
    // Faqja prapa nuk duhet të rrëshqasë ndërsa pamja është e hapur.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [go, onClose]);

  const item = media[current];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("mediaOpen")}
      className="fixed inset-0 z-[60] flex flex-col bg-bg/95 backdrop-blur-sm"
      onTouchStart={(event) => {
        touchStart.current = event.touches[0].clientX;
      }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;
        const delta = event.changedTouches[0].clientX - touchStart.current;
        if (Math.abs(delta) > 60) go(delta < 0 ? 1 : -1);
        touchStart.current = null;
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 p-3">
        <span className="tabular text-sm text-text-muted">
          {media.length > 1 ? `${current + 1} / ${media.length}` : null}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={tc("close")}
          className="grid size-9 place-items-center rounded-full bg-surface-solid text-text transition-colors duration-150 hover:bg-surface-2"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center gap-2 px-2 pb-4">
        {media.length > 1 ? (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={t("mediaPrevious")}
            className="hidden size-10 shrink-0 place-items-center rounded-full bg-surface-solid text-text transition-colors duration-150 hover:bg-surface-2 sm:grid"
          >
            <ChevronLeft className="size-5" />
          </button>
        ) : null}

        {item.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/media/${item.id}`}
            alt=""
            className="max-h-full min-w-0 max-w-full rounded-md object-contain"
          />
        ) : (
          <video
            key={item.id}
            src={`/api/media/${item.id}`}
            controls
            autoPlay
            playsInline
            className="max-h-full min-w-0 max-w-full rounded-md"
          />
        )}

        {media.length > 1 ? (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={t("mediaNext")}
            className="hidden size-10 shrink-0 place-items-center rounded-full bg-surface-solid text-text transition-colors duration-150 hover:bg-surface-2 sm:grid"
          >
            <ChevronRight className="size-5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
