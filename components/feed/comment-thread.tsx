"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/shared/empty-state";
import { addComment } from "@/lib/actions/posts";
import { timeAgoShort } from "@/lib/format";

export type CommentItem = {
  id: string;
  text: string;
  createdAt: string;
  author: {
    name: string;
    username: string;
    avatar: string | null;
    isVerified: boolean;
  };
};

export function CommentThread({
  postId,
  comments,
  viewer,
}: {
  postId: string;
  comments: CommentItem[];
  viewer: { name: string; avatar: string | null };
}) {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function submit() {
    const value = text.trim();
    if (value.length < 2) return;

    startTransition(async () => {
      const result = await addComment(postId, value);
      if (!result.ok) {
        toast.error(result.message ?? "S'u dërgua dot komenti.");
        return;
      }
      setText("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <Avatar name={viewer.name} src={viewer.avatar} size="sm" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Textarea
            autoGrow
            value={text}
            maxLength={1000}
            onChange={(event) => setText(event.target.value)}
            placeholder="Shkruaj diçka që ndihmon."
            aria-label="Komenti yt"
          />
          <div className="flex items-center gap-3">
            <span className="tabular text-xs text-text-muted">{text.length} / 1000</span>
            <Button
              size="sm"
              className="ml-auto"
              onClick={submit}
              loading={pending}
              disabled={text.trim().length < 2}
            >
              <Send />
              Dërgo
            </Button>
          </div>
        </div>
      </div>

      {comments.length === 0 ? (
        <EmptyState
          illustration="messages"
          compact
          title="Ende asnjë koment"
          description="Nëse e di përgjigjen ose ke përjetuar të njëjtën gjë, shkruaje. Dikush po e pret."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3 py-4 first:pt-0">
              <Link href={`/u/${comment.author.username}`} className="shrink-0">
                <Avatar
                  name={comment.author.name}
                  src={comment.author.avatar}
                  size="sm"
                  verified={comment.author.isVerified}
                />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <Link
                    href={`/u/${comment.author.username}`}
                    className="text-sm font-medium text-text hover:text-brand-500"
                  >
                    {comment.author.name}
                  </Link>
                  <span className="tabular text-xs text-text-muted">
                    {timeAgoShort(comment.createdAt)}
                  </span>
                </div>
                <p className="measure whitespace-pre-line text-sm text-text">{comment.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
