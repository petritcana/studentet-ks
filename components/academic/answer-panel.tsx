"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowBigDown, ArrowBigUp, Check, CheckCheck, Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/shared/empty-state";
import { acceptAnswer, answerQuestion, voteAnswer } from "@/lib/actions/academic";
import { timeAgoShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export type AnswerItem = {
  id: string;
  text: string;
  votes: number;
  createdAt: string;
  myVote: number;
  author: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
    isVerified: boolean;
  };
};

export function AnswerPanel({
  questionId,
  answers,
  acceptedAnswerId,
  isAuthor,
  viewer,
  canAnswerHint,
}: {
  questionId: string;
  answers: AnswerItem[];
  acceptedAnswerId: string | null;
  isAuthor: boolean;
  viewer: { name: string; avatar: string | null };
  canAnswerHint: string;
}) {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const ordered = [...answers].sort((a, b) => {
    if (a.id === acceptedAnswerId) return -1;
    if (b.id === acceptedAnswerId) return 1;
    return b.votes - a.votes;
  });

  function submit() {
    startTransition(async () => {
      const result = await answerQuestion(questionId, text);
      if (!result.ok) {
        toast.error(result.message ?? "S'u dërgua dot përgjigja.");
        return;
      }
      toast.success(result.message ?? "Përgjigja u dërgua.");
      setText("");
      router.refresh();
    });
  }

  function vote(answerId: string, value: 1 | -1) {
    startTransition(async () => {
      await voteAnswer(answerId, value);
      router.refresh();
    });
  }

  function accept(answerId: string) {
    startTransition(async () => {
      const result = await acceptAnswer(questionId, answerId);
      if (!result.ok) {
        toast.error(result.message ?? "S'u pranua dot.");
        return;
      }
      toast.success("E pranove përgjigjen. Autori mori 40 XP.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <h2 className="text-sm font-semibold text-text">Përgjigju</h2>
        <p className="mt-1 text-xs text-text-muted">{canAnswerHint}</p>
        <div className="mt-3 flex items-start gap-3">
          <Avatar name={viewer.name} src={viewer.avatar} size="sm" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Textarea
              autoGrow
              value={text}
              maxLength={4000}
              onChange={(event) => setText(event.target.value)}
              placeholder="Shpjego hapin ku gabohet, jo vetëm rezultatin."
              aria-label="Përgjigja jote"
            />
            <Button
              size="sm"
              className="self-end"
              onClick={submit}
              loading={pending}
              disabled={text.trim().length < 10}
            >
              <Send />
              Dërgo përgjigjen
            </Button>
          </div>
        </div>
      </Card>

      {ordered.length === 0 ? (
        <EmptyState
          illustration="messages"
          title="Ende asnjë përgjigje"
          description="Nëse e ke kaluar këtë lëndë, ti je personi që po pritet."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {ordered.map((answer) => {
            const accepted = answer.id === acceptedAnswerId;
            return (
              <Card
                key={answer.id}
                className={cn("p-4", accepted && "border-success/40 bg-success/6")}
              >
                <div className="flex gap-3">
                  <div className="flex shrink-0 flex-col items-center gap-0.5">
                    <button
                      type="button"
                      aria-label="Voto lart"
                      onClick={() => vote(answer.id, 1)}
                      className={cn(
                        "rounded-sm p-1 transition-colors duration-150 hover:bg-surface-2",
                        answer.myVote === 1 ? "text-brand-500" : "text-text-muted",
                      )}
                    >
                      <ArrowBigUp className="size-5" />
                    </button>
                    <span className="tabular text-sm font-medium text-text">{answer.votes}</span>
                    <button
                      type="button"
                      aria-label="Voto poshtë"
                      onClick={() => vote(answer.id, -1)}
                      className={cn(
                        "rounded-sm p-1 transition-colors duration-150 hover:bg-surface-2",
                        answer.myVote === -1 ? "text-danger-text" : "text-text-muted",
                      )}
                    >
                      <ArrowBigDown className="size-5" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/u/${answer.author.username}`}
                        className="flex items-center gap-2"
                      >
                        <Avatar
                          name={answer.author.name}
                          src={answer.author.avatar}
                          size="xs"
                          verified={answer.author.isVerified}
                        />
                        <span className="text-sm font-medium text-text hover:text-brand-500">
                          {answer.author.name}
                        </span>
                      </Link>
                      <span className="tabular text-xs text-text-muted">
                        {timeAgoShort(answer.createdAt)}
                      </span>
                      {accepted ? (
                        <Badge variant="success">
                          <CheckCheck />
                          Përgjigje e pranuar
                        </Badge>
                      ) : null}
                    </div>

                    <p className="measure mt-2 whitespace-pre-line text-sm text-text">
                      {answer.text}
                    </p>

                    {isAuthor && !acceptedAnswerId ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => accept(answer.id)}
                        disabled={pending}
                      >
                        <Check />
                        Prano këtë përgjigje
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
