"use client";

import { useReviewGuard } from "@/components/layout/review-state";
import { MentionSuggest } from "@/components/shared/mention-suggest";
import { RichText } from "@/components/shared/rich-text";
import { TimeAgo } from "@/components/shared/time-ago";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CornerDownRight, EyeOff, Flag, MessageCircle, Send, Trash2, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/shared/empty-state";
import { ReportDialog } from "@/components/shared/report-dialog";
import { UserIdentityLine } from "@/components/identity/user-identity-line";
import { addComment, deleteComment } from "@/lib/actions/posts";
import type { PublicAuthor } from "@/lib/dto";
import { cn } from "@/lib/utils";

export type CommentDto = {
  id: string;
  text: string;
  createdAt: string;
  /** Null te fijet anonime: aty identiteti nuk del kurrë nga serveri. */
  author: PublicAuthor | null;
  pseudonym: string | null;
  /** Prindi, kur komenti është përgjigje. Fija ka vetëm një nivel. */
  parentId: string | null;
  /** A është i shikuesit, që ta fshijë. */
  mine: boolean;
};

type Me = { name: string; avatar: string | null };

/** Komentet e rendit të parë, secili me përgjigjet e veta nën të. */
function threadOf(comments: CommentDto[]) {
  const ids = new Set(comments.map((comment) => comment.id));
  const replies = new Map<string, CommentDto[]>();
  const roots: CommentDto[] = [];

  for (const comment of comments) {
    // Një përgjigje prindi i së cilës u fsheh del si koment i zakonshëm, jo zhduket.
    if (comment.parentId && ids.has(comment.parentId)) {
      const list = replies.get(comment.parentId) ?? [];
      list.push(comment);
      replies.set(comment.parentId, list);
    } else {
      roots.push(comment);
    }
  }

  return roots.map((root) => ({ root, replies: replies.get(root.id) ?? [] }));
}

export function CommentThread({
  postId,
  comments,
  me,
}: {
  postId: string;
  comments: CommentDto[];
  me: Me;
}) {
  const t = useTranslations("feed");
  const [reportId, setReportId] = React.useState<string | null>(null);
  const [replyTo, setReplyTo] = React.useState<string | null>(null);
  const thread = React.useMemo(() => threadOf(comments), [comments]);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
        {t("comments")}
        {comments.length > 0 && (
          <span className="tabular rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-text-muted">
            {comments.length}
          </span>
        )}
      </h2>

      <CommentBox postId={postId} me={me} />

      {comments.length === 0 ? (
        <EmptyState illustration="messages" compact title={t("commentEmpty")} />
      ) : (
        <ul className="flex flex-col gap-1">
          {thread.map(({ root, replies }) => (
            <li key={root.id} className="animate-rise flex flex-col">
              <CommentItem
                comment={root}
                onReply={() => setReplyTo((current) => (current === root.id ? null : root.id))}
                onReport={() => setReportId(root.id)}
                replying={replyTo === root.id}
              />

              {(replies.length > 0 || replyTo === root.id) && (
                <div className="ml-4 flex flex-col gap-1 border-l border-border pl-4 sm:ml-5 sm:pl-5">
                  {replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      compact
                      onReply={() => setReplyTo(root.id)}
                      onReport={() => setReportId(reply.id)}
                    />
                  ))}

                  {replyTo === root.id && (
                    <div className="animate-rise py-2">
                      <CommentBox
                        postId={postId}
                        me={me}
                        parentId={root.id}
                        replyingTo={root.author?.name ?? root.pseudonym ?? ""}
                        onDone={() => setReplyTo(null)}
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ReportDialog
        open={reportId !== null}
        onOpenChange={(next) => setReportId(next ? reportId : null)}
        targetId={reportId ?? ""}
        targetType="comment"
      />
    </section>
  );
}

/** Kutia e shkrimit, për komentin e ri dhe për përgjigjen. */
function CommentBox({
  postId,
  me,
  parentId,
  replyingTo,
  onDone,
  autoFocus = false,
}: {
  postId: string;
  me: Me;
  parentId?: string;
  replyingTo?: string;
  onDone?: () => void;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("feed");
  const tc = useTranslations("common");
  const guard = useTranslations("guard");
  const errors = useTranslations("errors");
  const pro = useTranslations("pro");
  const [text, setText] = React.useState("");
  const textRef = React.useRef<HTMLTextAreaElement>(null);
  const blocked = useReviewGuard();
  const [pending, startTransition] = React.useTransition();

  function send() {
    const value = text.trim();
    if (value.length < 2) return;
    if (blocked()) return;

    startTransition(async () => {
      const result = await addComment(postId, value, parentId ?? null);
      if (!result.ok) {
        const key = result.messageKey ?? "";
        toast.error(
          key.startsWith("guard.")
            ? guard(key.replace("guard.", ""))
            : key.startsWith("errors.")
              ? errors(key.replace("errors.", ""))
              : key.startsWith("pro.")
                ? pro(key.replace("pro.", ""))
                : tc("retry"),
        );
        return;
      }
      setText("");
      onDone?.();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      {replyingTo && (
        <span className="flex items-center gap-1.5 text-xs text-text-muted">
          <CornerDownRight className="size-3.5" aria-hidden />
          {t("replyingTo", { name: replyingTo })}
          <button
            type="button"
            onClick={onDone}
            aria-label={tc("cancel")}
            className="ml-auto rounded-full p-1 transition-colors duration-150 hover:bg-surface-2 hover:text-text"
          >
            <X className="size-3.5" />
          </button>
        </span>
      )}
      <div className="relative flex items-start gap-3">
        <Avatar name={me.name} src={me.avatar} size="sm" />
        <MentionSuggest inputRef={textRef} value={text} onChange={setText} className="absolute bottom-full left-10 mb-1" />
        <Textarea
          ref={textRef}
          autoGrow
          autoFocus={autoFocus}
          value={text}
          maxLength={1000}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            // Ctrl+Enter dërgon, Enter i thjeshtë mbetet rresht i ri.
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              send();
            }
            if (event.key === "Escape" && onDone) onDone();
          }}
          placeholder={parentId ? t("replyPlaceholder") : t("commentPlaceholder")}
          aria-label={parentId ? t("replyPlaceholder") : t("commentPlaceholder")}
          className="min-h-11"
        />
        <Button
          size="icon"
          onClick={send}
          loading={pending}
          disabled={text.trim().length < 2}
          aria-label={tc("send")}
        >
          <Send />
        </Button>
      </div>
    </div>
  );
}

/** Një koment: identiteti, teksti dhe veprimet e vogla nën të. */
function CommentItem({
  comment,
  compact = false,
  replying = false,
  onReply,
  onReport,
}: {
  comment: CommentDto;
  compact?: boolean;
  replying?: boolean;
  onReply: () => void;
  onReport: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("feed");
  const tc = useTranslations("common");
  const [confirming, setConfirming] = React.useState(false);
  const [removing, startRemove] = React.useTransition();

  function remove() {
    startRemove(async () => {
      const result = await deleteComment(comment.id);
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      toast.success(t("commentDeleted"));
      router.refresh();
    });
  }

  return (
    <div
      data-comment={comment.id}
      className={cn(
        "group/comment flex flex-col gap-1.5 rounded-2xl px-2 py-2.5 transition-colors duration-150 hover:bg-surface-2/50",
        removing && "pointer-events-none opacity-50",
      )}
    >
      {comment.author ? (
        <UserIdentityLine
          user={comment.author}
          size="sm"
          inline
          showYear={false}
          trailing={
            <span className="tabular text-xs text-text-muted">
              <TimeAgo value={comment.createdAt} />
            </span>
          }
        />
      ) : (
        <span className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-text-muted">
            <EyeOff className="size-3.5" />
          </span>
          <span className="text-sm font-medium text-text">{comment.pseudonym}</span>
          <span className="tabular ml-auto text-xs text-text-muted">
            <TimeAgo value={comment.createdAt} />
          </span>
        </span>
      )}

      <p className={cn("measure whitespace-pre-wrap pl-10 text-sm text-text", compact && "text-[0.8125rem]")}>
        <RichText text={comment.text} />
      </p>

      <div className="flex items-center gap-1 pl-8">
        <ActionChip onClick={onReply} active={replying}>
          <MessageCircle className="size-3.5" aria-hidden />
          {t("reply")}
        </ActionChip>

        {comment.mine ? (
          confirming ? (
            <span className="animate-rise flex items-center gap-1">
              <ActionChip onClick={remove} danger>
                {t("deleteConfirm")}
              </ActionChip>
              <ActionChip onClick={() => setConfirming(false)}>{tc("cancel")}</ActionChip>
            </span>
          ) : (
            <ActionChip onClick={() => setConfirming(true)}>
              <Trash2 className="size-3.5" aria-hidden />
              {tc("delete")}
            </ActionChip>
          )
        ) : (
          <ActionChip onClick={onReport} quiet>
            <Flag className="size-3.5" aria-hidden />
            <span className="sr-only sm:not-sr-only">{tc("report")}</span>
          </ActionChip>
        )}
      </div>
    </div>
  );
}

function ActionChip({
  children,
  onClick,
  active = false,
  danger = false,
  quiet = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  quiet?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active || undefined}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-text-muted transition-all duration-150",
        "hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        active && "bg-brand-50 text-brand-600 dark:text-brand-500",
        danger && "text-danger-text hover:bg-danger-50 hover:text-danger-text",
        quiet && "opacity-100 sm:opacity-0 sm:group-hover/comment:opacity-100 sm:focus-visible:opacity-100",
      )}
    >
      {children}
    </button>
  );
}
