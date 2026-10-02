"use client";

import { RichText } from "@/components/shared/rich-text";
import { TimeAgo } from "@/components/shared/time-ago";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Calendar,
  Download,
  EyeOff,
  FileText,
  Flag,
  Link2,
  MapPin,
  MoreHorizontal,
  Pin,
  PinOff,
  Sparkles,
  Star,
  Trash2,
  Repeat2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { UserIdentityLine } from "@/components/identity/user-identity-line";
import { PostMedia } from "./post-media";
import { ReactionBar } from "./reaction-bar";
import { PaywallSheet, usePaywall } from "@/components/pro/paywall-sheet";
import { ReportDialog } from "@/components/shared/report-dialog";
import { deletePost, votePoll } from "@/lib/actions/posts";
import { featurePost, pinPost, unfeaturePost, unpinPost } from "@/lib/actions/pro";
import { formatBytes, formatDateShort, formatTime } from "@/lib/format";
import { facultyStyle } from "@/lib/faculties";
import type { PostDto } from "@/lib/dto";
import { cn } from "@/lib/utils";

const TEXT_CLAMP = 420;

export function PostCard({
  post,
  ownFaculty,
  authorOnline = false,
  isPro = false,
}: {
  post: PostDto;
  ownFaculty: string;
  /** Pika e gjelbër te autori. Vjen nga faqja, vetëm për ata që shikuesi i ndjek. */
  authorOnline?: boolean;
  /** A e ka shikuesi Pro-n: vendos nëse dalin ngulja dhe veçimi te menyja. */
  isPro?: boolean;
}) {
  // Te një ripostim, koka është një rresht teksti pa avatar, prandaj pika e
  // gjelbër nuk ka ku të shkojë: ajo i takon autorit të postimit origjinal.
  if (post.repostOf) return <RepostCard post={post} ownFaculty={ownFaculty} />;
  return (
    <PostBody post={post} ownFaculty={ownFaculty} authorOnline={authorOnline} isPro={isPro} />
  );
}

function RepostCard({ post, ownFaculty }: { post: PostDto; ownFaculty: string }) {
  const t = useTranslations("feed");
  const name = post.author.anonymous ? post.author.pseudonym : post.author.profile.name;
  const username = post.author.anonymous ? null : post.author.profile.username;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex items-center gap-1.5 px-1 text-xs text-text-muted">
        <Repeat2 className="size-3.5" aria-hidden />
        {username ? (
          <Link href={`/u/${username}`} className="font-medium text-text hover:underline">
            {name}
          </Link>
        ) : (
          <span className="font-medium text-text">{name}</span>
        )}
        <span>{t("repostedBy")}</span>
        <span aria-hidden>·</span>
        <TimeAgo value={post.createdAt} />
      </p>
      <PostBody post={post.repostOf!} ownFaculty={ownFaculty} authorOnline={false} />
    </div>
  );
}

function PostBody({
  post,
  ownFaculty,
  authorOnline,
  isPro = false,
}: {
  post: PostDto;
  ownFaculty: string;
  authorOnline: boolean;
  /** A e ka shikuesi Pro-n. Vendos nëse shfaqen ngulja dhe veçimi. */
  isPro?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("feed");
  const tt = useTranslations("postType");
  const tc = useTranslations("common");
  const tp = useTranslations("pro");
  const paywall = usePaywall();

  const [expanded, setExpanded] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [myVote, setMyVote] = React.useState(post.poll?.myOptionId ?? null);
  const [, startTransition] = React.useTransition();

  const long = post.text.length > TEXT_CLAMP;
  const visibleText = long && !expanded ? `${post.text.slice(0, TEXT_CLAMP).trimEnd()}…` : post.text;

  function vote(optionId: string) {
    if (myVote) return;
    setMyVote(optionId);
    startTransition(async () => {
      await votePoll(post.id, optionId);
      toast.success(t("pollVoted"));
      router.refresh();
    });
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/postimi/${post.id}`);
    toast.success(t("linkCopied"));
  }

  /** Veprimet e Pro-s kthejnë të njëjtën formë, prandaj trajtohen njësoj. */
  function run(work: Promise<{ ok: boolean; messageKey?: string }>) {
    startTransition(async () => {
      const result = await work;
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      if (result.messageKey) toast.success(tp(result.messageKey.replace("pro.", "")));
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deletePost(post.id);
      if (result.ok) {
        toast.success(t("deleted"));
        router.refresh();
      }
    });
  }

  const pollTotal = post.poll?.options.reduce((sum, option) => sum + option.votes, 0) ?? 0;
  const revealed = Boolean(myVote);

  return (
    <>
      <Card
        // Shenja që `ViewTracker` e ndjek: pamja numërohet kur karta hyn në ekran.
        data-post-id={post.id}
        className="flex flex-col gap-4 p-4 transition-colors duration-200 ease-out hover:bg-surface-2 sm:p-[22px]"
        style={post.course?.facultyCode ? facultyStyle(post.course.facultyCode) : undefined}
      >
        <header className="flex items-start gap-2">
          {post.author.anonymous ? (
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-surface-2 text-text-muted">
                <EyeOff className="size-4" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-base font-bold text-text">
                  {post.author.pseudonym}
                </span>
                <span className="text-[13px] text-text-muted">{tt("campus_voice")}</span>
              </span>
            </div>
          ) : (
            <UserIdentityLine
              user={post.author.profile}
              className="min-w-0 flex-1"
              size="post"
              online={authorOnline}
              follow={
                post.viewer.isAuthor || post.author.following
                  ? undefined
                  : { userId: post.author.profile.id, following: false }
              }
            />
          )}

          <div className="flex shrink-0 items-center gap-1">
            <TimeAgo value={post.createdAt} className="text-[13px] text-text-dim" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="iconSm" aria-label={t("moreActions")}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => void copyLink()}>
                  <Link2 />
                  {t("copyLink")}
                </DropdownMenuItem>
                {post.viewer.isAuthor && isPro ? (
                  <>
                    <DropdownMenuItem onSelect={() => run(post.pinned ? unpinPost() : pinPost(post.id))}>
                      {post.pinned ? <PinOff /> : <Pin />}
                      {post.pinned ? tp("unpin") : tp("pin")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        run(post.featured ? unfeaturePost(post.id) : featurePost(post.id))
                      }
                    >
                      <Sparkles />
                      {post.featured ? tp("unfeature") : tp("feature")}
                    </DropdownMenuItem>
                  </>
                ) : null}

                {post.viewer.isAuthor ? (
                  <DropdownMenuItem destructive onSelect={remove}>
                    <Trash2 />
                    {tc("delete")}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => setReportOpen(true)}>
                    <Flag />
                    {tc("report")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {post.pinned || post.featured ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {post.pinned ? (
              <Badge variant="neutral">
                <Pin className="size-3" />
                {tp("pinned")}
              </Badge>
            ) : null}
            {post.featured ? (
              <Badge variant="brand">
                <Sparkles className="size-3" />
                {tp("featured")}
              </Badge>
            ) : null}
          </div>
        ) : null}

        {post.course ? (
          <Link
            href={`/lenda/${post.course.id}`}
            className="w-fit rounded-full text-xs text-text-muted transition-colors hover:text-text"
          >
            <Badge variant="faculty">{post.course.name}</Badge>
          </Link>
        ) : null}

        <div className="flex flex-col gap-1">
          <p className="measure whitespace-pre-wrap text-pretty text-[15px] leading-[1.6] text-text sm:text-[15.5px]">
            <RichText text={visibleText} />
          </p>
          {long ? (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="w-fit text-xs font-medium text-brand-500 hover:underline"
            >
              {expanded ? t("showLess") : t("showMore")}
            </button>
          ) : null}
        </div>

        {post.material ? (
          <MaterialAttachment
            material={post.material}
            ownFaculty={ownFaculty}
            onLocked={() =>
              paywall.show({
                kind: "material",
                faculty: post.material?.facultyLabel ?? "",
                ownFaculty,
              })
            }
          />
        ) : null}

        {post.media.length > 0 ? <PostMedia media={post.media} /> : null}

        {post.event ? <EventAttachment event={post.event} /> : null}

        {post.poll ? (
          <div className="flex flex-col gap-2" role="group" aria-label={t("poll")}>
            {post.poll.options.map((option) => {
              const share = pollTotal > 0 ? Math.round((option.votes / pollTotal) * 100) : 0;
              const mine = myVote === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={revealed}
                  onClick={() => vote(option.id)}
                  aria-pressed={mine}
                  className={cn(
                    "relative flex items-center justify-between overflow-hidden rounded-control border px-3.5 py-2.5 text-left text-sm",
                    "transition-colors duration-150 ease-brand",
                    mine ? "border-brand-500 text-text" : "border-border text-text",
                    !revealed && "hover:border-brand-500/60",
                  )}
                >
                  {revealed ? (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-y-0 left-0 transition-all duration-400 ease-brand",
                        mine ? "bg-brand-500/18" : "bg-surface-2",
                      )}
                      style={{ width: `${share}%` }}
                    />
                  ) : null}
                  <span className="relative truncate">{option.text}</span>
                  {revealed ? (
                    <span className="tabular relative ml-3 shrink-0 text-xs text-text-muted">
                      {share}%
                    </span>
                  ) : null}
                </button>
              );
            })}
            <p className="tabular text-xs text-text-muted">
              {revealed ? t("pollVotes", { count: pollTotal }) : t("pollHint")}
            </p>
          </div>
        ) : null}

        <ReactionBar
          postId={post.id}
          counts={post.reactions}
          mine={post.viewer.reactions}
          comments={post.counts.comments}
          saves={post.counts.saves}
          saved={post.viewer.saved}
          reposts={post.counts.reposts}
          reposted={post.viewer.reposted}
        />
      </Card>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetId={post.id}
        targetType="post"
      />
      <PaywallSheet open={paywall.open} onOpenChange={paywall.setOpen} context={paywall.context} />
    </>
  );
}

/** Etiketa e shkurtër e skedarit mbi pllakë. */
function fileLabel(mime: string) {
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("wordprocessingml") || mime.includes("msword")) return "DOCX";
  if (mime.includes("presentationml") || mime.includes("powerpoint")) return "PPTX";
  if (mime.startsWith("image/")) return "IMG";
  return "DOC";
}

function MaterialAttachment({
  material,
  ownFaculty,
  onLocked,
}: {
  material: NonNullable<PostDto["material"]>;
  ownFaculty: string;
  onLocked: () => void;
}) {
  const t = useTranslations("feed");
  const tm = useTranslations("materialType");
  const tp = useTranslations("pro");
  const tv = useTranslations("verification");
  const tc = useTranslations("common");

  const body = (
    <div className="flex items-center gap-4">
      <span className="relative grid h-[60px] w-12 shrink-0 place-items-center rounded-[10px] bg-brand-50 text-brand-500">
        <FileText className="-mt-2 size-5" />
        <span className="absolute bottom-[5px] text-[8.5px] font-extrabold tracking-[0.06em]">
          {fileLabel(material.mimeType)}
        </span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="line-clamp-2 font-display text-[15px] font-bold leading-snug text-text">{material.title}</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-text-muted">
          <span>{tm(material.type)}</span>
          {material.facultyLabel ? <span>· {material.facultyLabel}</span> : null}
          {material.pages ? <span>· {material.pages}</span> : null}
          <span>· {formatBytes(material.size)}</span>
        </p>
        <p className="flex items-center gap-2 text-xs text-text-muted">
          {material.rating > 0 ? (
            <span className="tabular inline-flex items-center gap-1 text-[13px] font-bold text-warning-text">
              <Star className="size-3.5 fill-current" />
              {material.rating.toFixed(1)}
            </span>
          ) : null}
          {material.verificationStatus !== "verified" ? (
            <span>{tv(material.verificationStatus)}</span>
          ) : null}
        </p>
      </div>
    </div>
  );

  if (material.locked) {
    return (
      <div className="rounded-[18px] border border-border bg-surface-2 p-3.5">
        {body}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <p className="measure min-w-0 flex-1 text-xs text-text-muted">
            {tp("lockedBody", { ownFaculty })}
          </p>
          <Button variant="pro" size="sm" onClick={onLocked}>
            {tp("openWithPro")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/materialet/${material.id}`}
      aria-label={t("openMaterial")}
      className="group/material rounded-[18px] border border-border bg-surface-2 p-3.5 transition-colors duration-150 ease-out hover:border-border-strong"
    >
      <span className="flex items-center gap-3">
        <span className="min-w-0 flex-1">{body}</span>
        {/* Shkarkimi ndodh te faqja e materialit, ku kontrollohet qasja. */}
        <span className="hidden h-10 shrink-0 items-center gap-2 rounded-[12px] border border-border-strong px-4 text-[13.5px] font-semibold text-text transition-transform duration-150 group-hover/material:-translate-y-px sm:inline-flex">
          <Download className="size-4" aria-hidden />
          {tc("download")}
        </span>
      </span>
    </Link>
  );
}

function EventAttachment({ event }: { event: NonNullable<PostDto["event"]> }) {
  const locale = useLocale();
  const t = useTranslations("feed");
  const tk = useTranslations("eventKind");

  return (
    <Link
      href={`/eventet/${event.id}`}
      className="flex items-start gap-3 rounded-[18px] border border-border bg-surface-2 p-3.5 transition-colors duration-150 ease-out hover:border-border-strong"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-[10px] bg-brand-50 text-brand-500">
        <Calendar className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-semibold text-text">{event.title}</p>
        <p className="tabular flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
          <span>{tk(event.kind)}</span>
          <span>· {formatDateShort(event.date, locale)}</span>
          <span>· {formatTime(event.date)}</span>
        </p>
        <p className="flex items-center gap-1 text-xs text-text-muted">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{event.location}</span>
          {event.goingCount > 0 ? (
            <span className="shrink-0">· {t("goingCount", { count: event.goingCount })}</span>
          ) : null}
        </p>
      </div>
    </Link>
  );
}
