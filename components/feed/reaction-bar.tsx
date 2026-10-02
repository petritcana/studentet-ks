"use client";

import { useReviewGuard } from "@/components/layout/review-state";
import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Bookmark, Heart, MessageCircle, Repeat2, Send } from "lucide-react";
import { SharePostDialog } from "./share-post-dialog";
import { toast } from "@/components/ui/toast";
import { toggleBookmark, toggleReaction, toggleRepost } from "@/lib/actions/posts";
import { formatNumber } from "@/lib/format";
import type { ReactionType } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ReactionBar({
  postId,
  counts,
  mine,
  comments,
  saves,
  saved,
  reposts,
  reposted,
}: {
  postId: string;
  counts: Record<string, number>;
  mine: string[];
  comments: number;
  saves: number;
  saved: boolean;
  reposts: number;
  reposted: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("reaction");
  const tf = useTranslations("feed");
  const tc = useTranslations("common");

  const [active, setActive] = React.useState<string[]>(mine);
  const [tally, setTally] = React.useState(counts);
  const [isSaved, setIsSaved] = React.useState(saved);
  const [saveCount, setSaveCount] = React.useState(saves);
  const [isReposted, setIsReposted] = React.useState(reposted);
  const [repostCount, setRepostCount] = React.useState(reposts);
  const [sharing, setSharing] = React.useState(false);
  const [, startTransition] = React.useTransition();
  const blocked = useReviewGuard();

  function react(type: ReactionType) {
    if (blocked()) return;
    const on = active.includes(type);
    const before = { active, tally };

    setActive(on ? active.filter((item) => item !== type) : [...active, type]);
    setTally({ ...tally, [type]: Math.max(0, (tally[type] ?? 0) + (on ? -1 : 1)) });

    startTransition(async () => {
      const result = await toggleReaction(postId, type);
      if (!result.ok) {
        setActive(before.active);
        setTally(before.tally);
        toast.error(tc("retry"));
        return;
      }
      if (result.counts) setTally(result.counts);
      if (result.reactions) setActive(result.reactions);
    });
  }

  function save() {
    const next = !isSaved;
    setIsSaved(next);
    setSaveCount((value) => Math.max(0, value + (next ? 1 : -1)));
    startTransition(async () => {
      const result = await toggleBookmark(postId, "post");
      if (!result.ok) {
        setIsSaved(!next);
        setSaveCount((value) => Math.max(0, value + (next ? -1 : 1)));
        return;
      }
      if (result.saved) toast.success(tc("saved"));
    });
  }

  function repost() {
    if (blocked()) return;
    const next = !isReposted;
    setIsReposted(next);
    setRepostCount((value) => Math.max(0, value + (next ? 1 : -1)));
    startTransition(async () => {
      const result = await toggleRepost(postId);
      if (!result.ok) {
        setIsReposted(!next);
        setRepostCount((value) => Math.max(0, value + (next ? -1 : 1)));
        toast.error(tc("retry"));
        return;
      }
      if (typeof result.count === "number") setRepostCount(result.count);
      if (result.reposted) toast.success(tf("reposted"));
    });
  }

  const button = "inline-flex h-[38px] items-center gap-[7px] rounded-[12px] px-3 text-xs font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500 sm:px-3.5 sm:text-[13.5px] [&_svg]:size-[18px]";
  const idle = "text-text-muted hover:bg-surface-2 hover:text-text";
  const count = (value: number) => (value > 0 ? <span className="tabular">{formatNumber(value, locale)}</span> : null);

  const liked = active.includes("like");

  return (
    <footer className="-mb-1 flex items-center gap-1 sm:gap-1.5">
      <button
        type="button"
        onClick={() => react("like")}
        aria-pressed={liked}
        aria-label={t("like")}
        className={cn(button, liked ? "bg-like-soft text-like" : idle)}
      >
        {/*
          Zemra merr rozën e pëlqimit, jo të kuqen e gabimit. `key` e rinis
          animacionin çdo herë që pëlqehet.
        */}
        <Heart key={liked ? "on" : "off"} className={cn(liked && "animate-pop fill-current")} />
        <span className="hidden sm:inline">{t("likeShort")}</span>
        {count(tally.like ?? 0)}
      </button>

      <Link href={`/postimi/${postId}`} aria-label={tf("commentAction")} className={cn(button, idle)}>
        <MessageCircle />
        <span className="hidden sm:inline">{tf("commentShort")}</span>
        {count(comments)}
      </Link>

      <button
        type="button"
        onClick={repost}
        aria-pressed={isReposted}
        aria-label={isReposted ? tf("unrepost") : tf("repost")}
        className={cn(button, isReposted ? "text-success-text" : idle)}
      >
        <Repeat2 />
        <span className="hidden sm:inline">{tf("repost")}</span>
        {count(repostCount)}
      </button>

      {/* «Dërgo»: postimi te shokët, në DM. */}
      <button
        type="button"
        onClick={() => setSharing(true)}
        aria-label={tf("send")}
        className={cn(button, idle)}
        data-post-send
      >
        <Send />
        <span className="hidden sm:inline">{tf("send")}</span>
      </button>
      <SharePostDialog postId={postId} open={sharing} onOpenChange={setSharing} />

      <button
        type="button"
        onClick={save}
        aria-pressed={isSaved}
        aria-label={isSaved ? tf("unsave") : tf("save")}
        className={cn(button, "ml-auto", isSaved ? "text-brand-500" : idle)}
      >
        <Bookmark className={cn(isSaved && "fill-current")} />
        <span className="hidden sm:inline">{tf("save")}</span>
        {count(saveCount)}
      </button>
    </footer>
  );
}
