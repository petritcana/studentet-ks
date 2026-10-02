"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { defaultAvatarFor } from "@/lib/default-avatar";
import { shortName } from "@/lib/short-name";
import { cn } from "@/lib/utils";

export type StoryAuthor = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  facultyCode: string | null;
  seen: boolean;
  count: number;
  /** Storjet vetë, kur rafti i ka. Prej tyre del parapamja e pllakës. */
  items?: { kind: string; mediaUrl: string; seen: boolean }[];
};

/**
 * Pllaka: unaza rri te skaji, fotoja 4px më brenda, që mes tyre të mbetet një
 * vijë e hollë e errët, si te referenca.
 */
const TILE =
  "story-ring group relative h-[132px] w-[100px] shrink-0 rounded-[22px] text-left transition-transform duration-200 ease-out hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";

const FRAME = "absolute inset-[4px] overflow-hidden rounded-[18px] bg-surface-2";

/**
 * Pamja që mbush pllakën, si te referenca: personi. Fotoja e profilit kur ka,
 * përndryshe avatari i parazgjedhur i gjinisë së tij (`lib/default-avatar.ts`).
 */
function TileImage({ src, dim }: { src: string | null; dim?: boolean }) {
  return (
    <MediaImage
      src={src ?? defaultAvatarFor(null)}
      alt=""
      width={100}
      height={132}
      className={cn(
        "absolute inset-0 size-full object-cover transition-[transform,opacity,filter] duration-400 ease-brand group-hover:scale-105",
        dim && "opacity-55 saturate-[0.65]",
      )}
    />
  );
}

export function StoryBar({
  stories,
  me,
  onOpen,
  onCreate,
}: {
  stories: StoryAuthor[];
  me: { name: string; avatar: string | null };
  onOpen?: (authorId: string) => void;
  onCreate?: () => void;
}) {
  const t = useTranslations("stories");

  // Të pashikuarat përpara, pastaj të shikuarat. Rendi brenda grupit mbetet ai i serverit.
  const ordered = React.useMemo(
    () => [...stories].sort((a, b) => Number(a.seen) - Number(b.seen)),
    [stories],
  );

  return (
    <section aria-label={t("title")} className="flex flex-col gap-2">
      {/* Poshtë lihet vend për butonin «+», që del pak jashtë pllakës së parë. */}
      <div className="-mx-4 flex gap-3 overflow-x-auto scrollbar-none px-4 pb-2 pt-1 sm:mx-0 sm:px-0">
        {/* Pllaka e parë: fotoja jote, me «+» te qoshja për storje të re. */}
        <div className="relative shrink-0 pb-1 pr-2">
          <button
            type="button"
            onClick={onCreate}
            aria-label={t("add")}
            data-seen="true"
            data-story-add
            className={TILE}
          >
            <span className={FRAME}>
              <TileImage src={me.avatar} />
            </span>
          </button>
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-0 right-0 z-[3] grid size-8 place-items-center rounded-full bg-primary bg-primary-grad text-on-primary shadow-cta ring-4 ring-bg"
          >
            <Plus className="size-4 stroke-[2.5]" />
          </span>
        </div>

        {ordered.map((story, index) => {
          // Si te referenca: pllaka tregon personin, jo storjen. Storja hapet me prekje.
          const preview = story.avatar;
          return (
            <button
              key={story.id}
              type="button"
              onClick={() => onOpen?.(story.id)}
              aria-label={t("open", { name: story.name })}
              data-seen={story.seen}
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              className={cn(TILE, "animate-rise")}
            >
              <span className={cn(FRAME, "story-shade")}>
                <TileImage src={preview} dim={story.seen} />

                {story.count > 1 ? (
                  <span className="tabular absolute right-2 top-2 z-[1] grid size-6 place-items-center rounded-full bg-story-glass text-[11px] font-bold text-story-ink backdrop-blur-[6px]">
                    {story.count}
                  </span>
                ) : null}

                <span
                  className={cn(
                    "absolute inset-x-2.5 bottom-2 z-[1] truncate text-[13px] font-bold leading-tight text-story-ink",
                    story.seen && "opacity-75",
                  )}
                >
                  {shortName(story.name)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
