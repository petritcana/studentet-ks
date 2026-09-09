"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Bookmark,
  CalendarDays,
  Download,
  EyeOff,
  FileText,
  Flag,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/toast";
import { ReportDialog } from "@/components/shared/report-dialog";
import type { PostDto } from "@/lib/dto";
import {
  deletePost,
  toggleBookmark,
  toggleReaction,
  votePoll,
} from "@/lib/actions/posts";
import {
  MATERIAL_TYPE_LABELS,
  POST_TYPE_LABELS,
  VERIFICATION_LABELS,
  type MaterialType,
  type PostType,
  type VerificationStatus,
} from "@/lib/constants";
import { facultyTheme } from "@/lib/faculties";
import { formatEventDate, timeAgoShort } from "@/lib/format";
import { cn, formatBytes, formatNumber } from "@/lib/utils";

export function PostCard({ post }: { post: PostDto }) {
  const router = useRouter();
  const [liked, setLiked] = React.useState(post.viewer.liked);
  const [likes, setLikes] = React.useState(post.counts.likes);
  const [saved, setSaved] = React.useState(post.viewer.saved);
  const [pollChoice, setPollChoice] = React.useState(post.poll?.myOptionId ?? null);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [, startTransition] = React.useTransition();

  const anonymous = post.author.anonymous;
  const theme = facultyTheme(
    post.course?.facultyColor ??
      (post.author.anonymous ? null : post.author.profile.facultyColor),
  );

  function onLike() {
    const next = !liked;
    setLiked(next);
    setLikes((value) => value + (next ? 1 : -1));
    startTransition(async () => {
      const result = await toggleReaction(post.id);
      if (!result.ok) {
        setLiked(!next);
        setLikes((value) => value + (next ? -1 : 1));
      }
    });
  }

  function onSave() {
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const result = await toggleBookmark(post.id, "post");
      if (!result.ok) {
        setSaved(!next);
        return;
      }
      if (next) toast.success("E ruajtëm", { description: "E gjen te Unë · Ruajtjet." });
    });
  }

  function onVote(optionId: string) {
    setPollChoice(optionId);
    startTransition(async () => {
      await votePoll(post.id, optionId);
      router.refresh();
    });
  }

  function onShare() {
    const url = `${window.location.origin}/postimi/${post.id}`;
    if (navigator.share) {
      void navigator.share({ url }).catch(() => undefined);
      return;
    }
    void navigator.clipboard.writeText(url);
    toast.success("Linku u kopjua.");
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 p-4 pb-3">
        {anonymous ? (
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-text-muted">
            <EyeOff className="size-4" />
          </span>
        ) : (
          <Link href={`/u/${post.author.profile.username}`} className="shrink-0">
            <Avatar
              name={post.author.profile.name}
              src={post.author.profile.avatar}
              verified={post.author.profile.isVerified}
            />
          </Link>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-baseline gap-x-2">
            {anonymous ? (
              <span className="text-sm font-semibold text-text">
                {post.author.profile.pseudonym}
              </span>
            ) : (
              <Link
                href={`/u/${post.author.profile.username}`}
                className="text-sm font-semibold text-text hover:text-brand-500"
              >
                {post.author.profile.name}
              </Link>
            )}
            <span className="tabular text-xs text-text-muted">
              {timeAgoShort(post.createdAt)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {!anonymous && post.author.profile.facultyName ? (
              <span className="truncate text-xs text-text-muted">
                {post.author.profile.facultyName
                  .replace("Fakulteti i ", "")
                  .replace("Fakulteti ", "")}
                {post.author.profile.year ? `, viti ${post.author.profile.year}` : ""}
              </span>
            ) : null}
            {anonymous ? (
              <span className="text-xs text-text-muted">Zëri i kampusit</span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {post.type !== "text" ? (
            <Badge variant={anonymous ? "warning" : "neutral"} className="hidden sm:inline-flex">
              {POST_TYPE_LABELS[post.type as PostType] ?? post.type}
            </Badge>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Më shumë veprime">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onSave}>
                <Bookmark />
                {saved ? "Hiqe nga ruajtjet" : "Ruaje"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onShare}>
                <Share2 />
                Ndaje
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {post.viewer.isAuthor ? (
                <DropdownMenuItem
                  destructive
                  onSelect={() =>
                    startTransition(async () => {
                      const result = await deletePost(post.id);
                      if (result.ok) {
                        toast.success("E fshive.");
                        router.refresh();
                      }
                    })
                  }
                >
                  <Trash2 />
                  Fshije
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem destructive onSelect={() => setReportOpen(true)}>
                  <Flag />
                  Raporto
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {post.course ? (
        <div className="px-4 pb-2">
          <Link href={`/lenda/${post.course.id}`}>
            <Badge className={cn(theme.bg, theme.text, theme.border)}>
              {post.course.name}
            </Badge>
          </Link>
        </div>
      ) : null}

      <div className="px-4 pb-3">
        <p className="measure whitespace-pre-line text-sm text-text">{post.text}</p>
      </div>

      {post.material ? <MaterialPreview material={post.material} /> : null}
      {post.event ? <EventPreview event={post.event} /> : null}
      {post.poll ? (
        <PollPreview poll={post.poll} choice={pollChoice} onVote={onVote} />
      ) : null}

      <div className="flex items-center gap-1 border-t border-border px-2 py-1.5">
        <Button size="sm" variant="ghost" onClick={onLike} aria-pressed={liked}>
          <Heart className={cn(liked && "fill-danger text-danger")} />
          <span className="tabular">{formatNumber(likes)}</span>
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <Link href={`/postimi/${post.id}`}>
            <MessageCircle />
            <span className="tabular">{formatNumber(post.counts.comments)}</span>
          </Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={onSave} aria-pressed={saved}>
          <Bookmark className={cn(saved && "fill-brand-500 text-brand-500")} />
          <span className="sr-only">Ruaje</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={onShare} className="ml-auto">
          <Share2 />
          <span className="sr-only">Ndaje</span>
        </Button>
      </div>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetId={post.id}
        targetType="post"
      />
    </Card>
  );
}

function MaterialPreview({ material }: { material: NonNullable<PostDto["material"]> }) {
  return (
    <Link
      href={`/materialet/${material.id}`}
      className="mx-4 mb-3 flex items-center gap-3 rounded-md border border-border bg-surface-2 p-3 transition-colors duration-150 hover:border-brand-500/40"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-500/12 text-brand-500">
        <FileText className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-text">{material.title}</span>
        <span className="truncate text-xs text-text-muted">
          {MATERIAL_TYPE_LABELS[material.type as MaterialType] ?? material.type}
          {material.pages ? ` · ${material.pages} faqe` : ""} · {formatBytes(material.size)}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {material.verificationStatus === "verified" ? (
          <Badge variant="success">
            <BadgeCheck />
            {VERIFICATION_LABELS.verified}
          </Badge>
        ) : (
          <Badge variant="warning">
            {VERIFICATION_LABELS[material.verificationStatus as VerificationStatus] ??
              "Pa verifikuar"}
          </Badge>
        )}
        <span className="tabular inline-flex items-center gap-1 text-xs text-text-muted">
          <Download className="size-3" />
          {formatNumber(material.downloads)}
        </span>
      </span>
    </Link>
  );
}

function EventPreview({ event }: { event: NonNullable<PostDto["event"]> }) {
  return (
    <Link
      href={`/eventet/${event.id}`}
      className="mx-4 mb-3 flex items-center gap-3 rounded-md border border-border bg-surface-2 p-3 transition-colors duration-150 hover:border-brand-500/40"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-accent-500/12 text-accent-text">
        <CalendarDays className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-text">{event.title}</span>
        <span className="truncate text-xs text-text-muted">
          {formatEventDate(event.date)} · {event.location}
        </span>
      </span>
      <span className="tabular inline-flex shrink-0 items-center gap-1 text-xs text-text-muted">
        <Users className="size-3" />
        {event.goingCount}
      </span>
    </Link>
  );
}

function PollPreview({
  poll,
  choice,
  onVote,
}: {
  poll: NonNullable<PostDto["poll"]>;
  choice: string | null;
  onVote: (optionId: string) => void;
}) {
  const total = poll.totalVotes + (choice && !poll.myOptionId ? 1 : 0);

  return (
    <div className="mx-4 mb-3 flex flex-col gap-2">
      {poll.options.map((option) => {
        const votes = option.votes + (choice === option.id && !poll.myOptionId ? 1 : 0);
        const percent = total > 0 ? Math.round((votes / total) * 100) : 0;
        const mine = choice === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onVote(option.id)}
            aria-pressed={mine}
            className={cn(
              "flex flex-col gap-1.5 rounded-md border p-2.5 text-left transition-colors duration-150",
              mine ? "border-brand-500 bg-brand-500/8" : "border-border hover:border-brand-500/40",
            )}
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-text">{option.text}</span>
              {choice ? (
                <span className="tabular shrink-0 text-xs text-text-muted">{percent}%</span>
              ) : null}
            </span>
            {choice ? <Progress value={percent} size="sm" /> : null}
          </button>
        );
      })}
      <p className="tabular text-xs text-text-muted">
        {total} {total === 1 ? "votë" : "vota"}
        {choice ? "" : " · vota jote shihet pasi të zgjedhësh"}
      </p>
    </div>
  );
}

export function PostCardSkeletonNote() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-text-muted">
      <Star className="size-3" />
      Renditja bëhet nga afërsia sociale, relevanca akademike dhe freskia.
    </p>
  );
}
