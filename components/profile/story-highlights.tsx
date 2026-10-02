"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MediaImage } from "@/components/ui/media-image";
import { toast } from "@/components/ui/toast";
import { StoryViewer } from "@/components/feed/story-viewer";
import { HighlightCoverPicker } from "./highlight-cover-picker";
import { deleteHighlight, saveHighlight } from "@/lib/actions/highlights";
import { MAX_HIGHLIGHT_TITLE } from "@/lib/highlight-limits";
import type { ArchiveStory, HighlightView } from "@/lib/queries/highlights";
import type { StoryGroup } from "@/lib/queries/stories";
import { cn } from "@/lib/utils";

type Owner = { id: string; name: string; username: string; avatar: string | null; facultyCode: string | null };

/**
 * Dosjet e storjeve në profil, si te Instagram: rrathë me titull nën kokën e
 * profilit. Prekja e hap dosjen si storje. Pronari ka «E re» dhe lapsin për të
 * zgjedhur storjet nga arkivi i vet.
 */
export function StoryHighlights({
  owner,
  highlights,
  isMe,
  archive,
  viewerId,
}: {
  owner: Owner;
  highlights: HighlightView[];
  isMe: boolean;
  /** Kush po shikon: te dosjet e të tjerëve mund t'i përgjigjet storjes. */
  viewerId: string;
  /** Vetëm për pronarin: storjet e tij, edhe të skaduarat. */
  archive: ArchiveStory[];
}) {
  const t = useTranslations("highlights");
  const [viewing, setViewing] = React.useState<HighlightView | null>(null);
  const [editing, setEditing] = React.useState<HighlightView | "new" | null>(null);

  if (!isMe && highlights.length === 0) return null;

  const group: StoryGroup | null = viewing
    ? {
        id: owner.id,
        name: `${owner.name} · ${viewing.title}`,
        username: owner.username,
        avatar: owner.avatar,
        facultyCode: owner.facultyCode,
        seen: true,
        count: viewing.items.length,
        items: viewing.items,
      }
    : null;

  return (
    <section aria-label={t("title")} data-story-highlights>
      <div className="-mx-4 flex gap-4 overflow-x-auto scrollbar-none px-4 py-1 sm:mx-0 sm:px-1">
        {isMe ? (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="group flex w-[76px] shrink-0 flex-col items-center gap-1.5"
            data-highlight-new
          >
            <span className="grid size-[68px] place-items-center rounded-full border-2 border-dashed border-border-strong text-text-muted transition-colors group-hover:border-brand-500 group-hover:text-text">
              <Plus className="size-6" />
            </span>
            <span className="w-full truncate text-center text-xs font-medium text-text-muted">{t("new")}</span>
          </button>
        ) : null}

        {highlights.map((highlight) => (
          <div key={highlight.id} className="relative flex w-[76px] shrink-0 flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => setViewing(highlight)}
              aria-label={t("open", { title: highlight.title })}
              data-highlight={highlight.title}
              className="rounded-full p-[3px] ring-2 ring-border-strong transition-transform duration-150 hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-brand-500"
            >
              <span className="bg-sunset relative block size-[62px] overflow-hidden rounded-full">
                {highlight.cover ? (
                  <MediaImage src={highlight.cover} alt="" width={62} height={62} className="size-full object-cover" />
                ) : (
                  <span className="grid size-full place-items-center text-lg font-extrabold uppercase text-white">
                    {highlight.title.slice(0, 1)}
                  </span>
                )}
              </span>
            </button>
            <span className="w-full truncate text-center text-xs font-semibold text-text">{highlight.title}</span>
            {isMe ? (
              <button
                type="button"
                onClick={() => setEditing(highlight)}
                aria-label={t("edit", { title: highlight.title })}
                className="absolute right-0 top-0 grid size-6 place-items-center rounded-full border border-border bg-surface-solid text-text-muted shadow-soft transition-colors hover:text-text"
              >
                <Pencil className="size-3" />
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {group ? (
        <StoryViewer
          groups={[group]}
          startIndex={0}
          onClose={() => setViewing(null)}
          meId={viewerId}
          action={
            isMe && viewing
              ? {
                  label: t("editShort"),
                  icon: <Pencil />,
                  onClick: () => {
                    setEditing(viewing);
                    setViewing(null);
                  },
                }
              : undefined
          }
        />
      ) : null}

      {isMe && editing ? (
        <HighlightDialog
          key={editing === "new" ? "new" : editing.id}
          highlight={editing === "new" ? null : editing}
          archive={archive}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </section>
  );
}

/** Krijimi ose ndryshimi i një dosjeje: titulli dhe storjet nga arkivi, në rendin e zgjedhjes. */
function HighlightDialog({
  highlight,
  archive,
  onClose,
}: {
  highlight: HighlightView | null;
  archive: ArchiveStory[];
  onClose: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("highlights");
  const tc = useTranslations("common");
  const [title, setTitle] = React.useState(highlight?.title ?? "");
  const [picked, setPicked] = React.useState<string[]>(highlight?.items.map((item) => item.id) ?? []);
  const [cover, setCover] = React.useState<string | null>(highlight?.coverUrl ?? null);
  const [uploading, setUploading] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const pickedStories = picked
    .map((id) => archive.find((story) => story.id === id))
    .filter((story): story is ArchiveStory => Boolean(story));

  function toggle(id: string) {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function save() {
    startTransition(async () => {
      // Kur storja që ishte foto e dosjes hiqet nga dosja, rrethi kthehet te storja e parë.
      const storyUrls = new Set(archive.map((story) => story.mediaUrl));
      const keepCover = cover && (!storyUrls.has(cover) || pickedStories.some((story) => story.mediaUrl === cover));
      const result = await saveHighlight({ id: highlight?.id, title, storyIds: picked, coverUrl: keepCover ? cover : null });
      if (!result.ok) {
        toast.error(result.messageKey === "highlights.errorTooMany" ? t("errorTooMany") : t("errorInvalid"));
        return;
      }
      toast.success(t("saved"));
      onClose();
      router.refresh();
    });
  }

  function remove() {
    if (!highlight) return;
    startTransition(async () => {
      const result = await deleteHighlight(highlight.id);
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      toast.success(t("deleted"));
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-xl" data-highlight-dialog>
        <DialogHeader>
          <DialogTitle>{highlight ? t("editTitle") : t("newTitle")}</DialogTitle>
          <DialogDescription>{t("dialogBody")}</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value.slice(0, MAX_HIGHLIGHT_TITLE))}
            placeholder={t("titlePlaceholder")}
            aria-label={t("titlePlaceholder")}
            autoFocus
          />

          {pickedStories.length > 0 || cover ? (
            <HighlightCoverPicker value={cover} onChange={setCover} stories={pickedStories} onBusyChange={setUploading} />
          ) : null}

          {archive.length === 0 ? (
            <p className="rounded-control border border-dashed border-border p-6 text-center text-sm text-text-muted">
              {t("archiveEmpty")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-text-muted">{t("archiveLabel", { count: picked.length })}</p>
              <ul className="grid max-h-[46vh] grid-cols-4 gap-2 overflow-y-auto scrollbar-thin sm:grid-cols-5">
                {archive.map((story) => {
                  const order = picked.indexOf(story.id);
                  const chosen = order >= 0;
                  return (
                    <li key={story.id}>
                      <button
                        type="button"
                        onClick={() => toggle(story.id)}
                        aria-pressed={chosen}
                        className={cn(
                          "relative block aspect-[9/16] w-full overflow-hidden rounded-[12px] bg-surface-2 ring-2 transition-[box-shadow,opacity] duration-150",
                          chosen ? "ring-brand-500" : "ring-transparent opacity-80 hover:opacity-100",
                        )}
                      >
                        {story.kind === "image" ? (
                          <MediaImage src={story.mediaUrl} alt="" width={90} height={160} className="size-full object-cover" />
                        ) : (
                          <video src={story.mediaUrl} muted playsInline preload="metadata" className="size-full object-cover" />
                        )}
                        <span
                          className={cn(
                            "absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full border-2 text-[11px] font-bold",
                            chosen ? "border-brand-500 bg-brand-500 text-brand-contrast" : "border-white/80 bg-black/30",
                          )}
                        >
                          {chosen ? order + 1 : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </DialogBody>
        <DialogFooter className="flex-row items-center justify-between gap-2">
          {highlight ? (
            <Button variant="ghost" onClick={remove} disabled={pending} className="text-danger-text">
              {tc("delete")}
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={save} loading={pending} disabled={!title.trim() || picked.length === 0 || uploading}>
            <Check />
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
