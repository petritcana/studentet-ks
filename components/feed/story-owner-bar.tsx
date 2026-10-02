"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Archive, Check, FolderPlus, Plus, Trash2, X } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { toast } from "@/components/ui/toast";
import {
  addStoryToHighlight,
  listHighlightChoices,
  saveHighlight,
  type HighlightChoice,
} from "@/lib/actions/highlights";
import { archiveStory, deleteStory } from "@/lib/actions/stories";
import { MAX_HIGHLIGHT_TITLE } from "@/lib/highlight-limits";
import { cn } from "@/lib/utils";

type Panel = null | "highlight" | "delete";

/**
 * Poshtë storjes sime: Shto në dosje, Arkivo, Fshije.
 *
 * Arkivimi e heq storjen nga rafti menjëherë, por e mban te arkivi për dosjet.
 * Fshirja kërkon një konfirmim, sepse nuk kthehet. Sa kohë një panel është i
 * hapur, storja ndalet.
 */
export function StoryOwnerBar({
  storyId,
  onPauseChange,
  onRemoved,
}: {
  storyId: string;
  onPauseChange: (paused: boolean) => void;
  /** Storja doli nga rafti (u fshi ose u arkivua): shikuesi kalon te tjetra. */
  onRemoved: () => void;
}) {
  const t = useTranslations("stories");
  const tAll = useTranslations();
  const [panel, setPanelState] = React.useState<Panel>(null);
  const [pending, startTransition] = React.useTransition();

  function setPanel(next: Panel) {
    setPanelState(next);
    onPauseChange(next !== null);
  }

  function archive() {
    startTransition(async () => {
      const result = await archiveStory(storyId);
      if (!result.ok) {
        toast.error(tAll(result.messageKey ?? "errors.generic"));
        return;
      }
      toast.success(t("archived"));
      onRemoved();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteStory(storyId);
      if (!result.ok) {
        toast.error(tAll(result.messageKey ?? "errors.generic"));
        return;
      }
      toast.success(t("deleted"));
      setPanel(null);
      onRemoved();
    });
  }

  return (
    <div className="flex flex-col gap-2" data-story-owner>
      {panel === "highlight" ? (
        <HighlightPanel storyId={storyId} onClose={() => setPanel(null)} />
      ) : null}

      {panel === "delete" ? (
        <div className="flex flex-col gap-3 rounded-card bg-surface-solid p-4 text-text shadow-soft" role="alertdialog" aria-label={t("deleteTitle")}>
          <p className="text-sm font-semibold">{t("deleteTitle")}</p>
          <p className="text-xs text-text-muted">{t("deleteBody")}</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPanel(null)} className="h-9 rounded-control px-3 text-sm font-semibold text-text-muted hover:text-text">
              {tAll("common.cancel")}
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="h-9 rounded-control bg-danger px-4 text-sm font-semibold text-white disabled:opacity-60"
              data-story-delete-confirm
            >
              {t("delete")}
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        <OwnerButton icon={<FolderPlus />} label={t("addToHighlight")} onClick={() => setPanel(panel === "highlight" ? null : "highlight")} active={panel === "highlight"} data="highlight" />
        <OwnerButton icon={<Archive />} label={t("archive")} onClick={archive} disabled={pending} data="archive" />
        <OwnerButton icon={<Trash2 />} label={t("delete")} onClick={() => setPanel(panel === "delete" ? null : "delete")} active={panel === "delete"} data="delete" />
      </div>
    </div>
  );
}

function OwnerButton({
  icon,
  label,
  onClick,
  active,
  disabled,
  data,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  data: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-center gap-1 rounded-control px-2 py-2 text-[11px] font-semibold text-white transition-colors duration-150 disabled:opacity-60 [&_svg]:size-5",
        active ? "bg-white/25" : "bg-black/30 hover:bg-white/15",
      )}
      data-story-owner-action={data}
    >
      {icon}
      {label}
    </button>
  );
}

/** Dosjet e mia: prekja e shton storjen, dhe «Dosje e re» e krijon me këtë storje brenda. */
function HighlightPanel({ storyId, onClose }: { storyId: string; onClose: () => void }) {
  const t = useTranslations("stories");
  const th = useTranslations("highlights");
  const tAll = useTranslations();
  const [choices, setChoices] = React.useState<HighlightChoice[] | null>(null);
  const [title, setTitle] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    let alive = true;
    void listHighlightChoices(storyId).then((rows) => {
      if (alive) setChoices(rows);
    });
    return () => {
      alive = false;
    };
  }, [storyId]);

  function add(choice: HighlightChoice) {
    if (choice.contains) return;
    startTransition(async () => {
      const result = await addStoryToHighlight(storyId, choice.id);
      if (!result.ok) {
        toast.error(tAll(result.messageKey ?? "errors.generic"));
        return;
      }
      setChoices((rows) => rows?.map((row) => (row.id === choice.id ? { ...row, contains: true } : row)) ?? rows);
      toast.success(t("addedTo", { title: choice.title }));
    });
  }

  function create() {
    const name = title.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await saveHighlight({ title: name, storyIds: [storyId] });
      if (!result.ok || !result.id) {
        toast.error(result.messageKey === "highlights.errorTooMany" ? th("errorTooMany") : th("errorInvalid"));
        return;
      }
      setChoices((rows) => [...(rows ?? []), { id: result.id!, title: name, cover: null, contains: true }]);
      setTitle("");
      toast.success(t("addedTo", { title: name }));
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-card bg-surface-solid p-4 text-text shadow-soft" data-story-highlight-panel>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{t("addToHighlight")}</p>
        <button type="button" onClick={onClose} aria-label={tAll("common.close")} className="grid size-7 place-items-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
        {choices === null
          ? Array.from({ length: 3 }, (_, index) => (
              <span key={index} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                <span className="size-14 animate-pulse rounded-full bg-surface-2" />
                <span className="h-2.5 w-10 animate-pulse rounded-full bg-surface-2" />
              </span>
            ))
          : choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => add(choice)}
                disabled={pending}
                aria-pressed={choice.contains}
                className="flex w-16 shrink-0 flex-col items-center gap-1.5"
                data-story-highlight-choice={choice.title}
              >
                <span
                  className={cn(
                    "bg-sunset relative block size-14 overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-surface-solid",
                    choice.contains ? "ring-brand-500" : "ring-border-strong",
                  )}
                >
                  {choice.cover ? (
                    <MediaImage src={choice.cover} alt="" width={56} height={56} className="size-full object-cover" />
                  ) : null}
                  {choice.contains ? (
                    <span className="absolute inset-0 grid place-items-center bg-black/40 text-white">
                      <Check className="size-5" />
                    </span>
                  ) : null}
                </span>
                <span className="w-full truncate text-center text-[11px] font-semibold">{choice.title}</span>
              </button>
            ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value.slice(0, MAX_HIGHLIGHT_TITLE))}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Enter") create();
          }}
          placeholder={th("titlePlaceholder")}
          aria-label={th("newTitle")}
          className="h-10 min-w-0 flex-1 rounded-control border border-border bg-surface-2 px-3 text-sm text-text placeholder:text-text-muted focus:border-brand-500 focus:outline-none"
          data-story-highlight-new
        />
        <button
          type="button"
          onClick={create}
          disabled={pending || !title.trim()}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-control bg-primary px-3 text-sm font-semibold text-on-primary disabled:opacity-50"
        >
          <Plus className="size-4" />
          {th("newTitle")}
        </button>
      </div>
    </div>
  );
}
