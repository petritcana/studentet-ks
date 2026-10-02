"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Heart, SendHorizontal } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { reactToStory, replyToStory } from "@/lib/actions/messages";
import { STORY_REACTIONS } from "@/lib/story-reactions";
import { cn } from "@/lib/utils";

/**
 * Poshtë storjes së dikujt tjetër: përgjigja dhe reagimi.
 *
 * Të dyja shkojnë si mesazh te biseda me autorin, me storjen bashkë. Kur
 * studenti shkruan ose zgjedh reagim, storja ndalet që të mos ikë nga sytë.
 * Prindi e jep me `key={storyId}`, që çdo storje të nisë pa tekst dhe pa reagim.
 */
export function StoryReplyBar({
  storyId,
  authorName,
  onPauseChange,
}: {
  storyId: string;
  authorName: string;
  onPauseChange: (paused: boolean) => void;
}) {
  const t = useTranslations("stories");
  const tAll = useTranslations();
  const [text, setText] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const [reacted, setReacted] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function send() {
    const value = text.trim();
    if (!value) return;
    startTransition(async () => {
      const result = await replyToStory(storyId, value);
      if (!result.ok) {
        toast.error(tAll(result.messageKey ?? "errors.generic"));
        return;
      }
      setText("");
      toast.success(t("replySent", { name: authorName }));
    });
  }

  function react(emoji: string) {
    // Optimiste: emoji ndriçon menjëherë, dhe kthehet nëse serveri refuzon.
    const previous = reacted;
    setReacted(emoji);
    startTransition(async () => {
      const result = await reactToStory(storyId, emoji);
      if (!result.ok) {
        setReacted(previous);
        toast.error(tAll(result.messageKey ?? "errors.generic"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-2" data-story-reply>
      {focused ? (
        <div className="flex justify-center gap-2" role="group" aria-label={t("reactLabel")}>
          {STORY_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              // Pa këtë, klikimi e humb fokusin e fushës dhe rreshti mbyllet para se të numërohet.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => react(emoji)}
              aria-pressed={reacted === emoji}
              className={cn(
                "grid size-10 place-items-center rounded-full text-2xl transition-transform duration-150 hover:scale-110",
                reacted === emoji ? "bg-white/25" : "bg-black/30",
              )}
              data-story-react={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, 1000))}
          onFocus={() => {
            setFocused(true);
            onPauseChange(true);
          }}
          onBlur={() => {
            setFocused(false);
            if (!text.trim()) onPauseChange(false);
          }}
          onKeyDown={(event) => {
            // Shigjetat dhe Escape i përkasin fushës, jo shikuesit.
            event.stopPropagation();
            if (event.key === "Enter") send();
            if (event.key === "Escape") (event.target as HTMLInputElement).blur();
          }}
          placeholder={t("replyPlaceholder", { name: authorName })}
          aria-label={t("replyPlaceholder", { name: authorName })}
          className="h-11 min-w-0 flex-1 rounded-full border border-white/40 bg-black/30 px-4 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none"
          data-story-reply-input
        />
        {text.trim() ? (
          <button
            type="button"
            onClick={send}
            disabled={pending}
            aria-label={t("replySend")}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-on-primary transition-transform duration-150 hover:-translate-y-px disabled:opacity-60"
            data-story-reply-send
          >
            <SendHorizontal className="size-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => react("❤️")}
            aria-label={t("reactLike")}
            aria-pressed={reacted === "❤️"}
            className="grid size-11 shrink-0 place-items-center rounded-full text-white transition-transform duration-150 hover:scale-110"
            data-story-like
          >
            <Heart className={cn("size-7", reacted === "❤️" && "fill-like text-like")} />
          </button>
        )}
      </div>
    </div>
  );
}
