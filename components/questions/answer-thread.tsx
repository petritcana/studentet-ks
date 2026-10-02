"use client";

import { TimeAgo } from "@/components/shared/time-ago";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowBigDown, ArrowBigUp, Check, CheckCircle2, GraduationCap, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/shared/empty-state";
import { UserIdentityLine } from "@/components/identity/user-identity-line";
import { acceptAnswer, answerQuestion, voteAnswer } from "@/lib/actions/questions";
import type { PublicAuthor } from "@/lib/dto";
import { cn } from "@/lib/utils";
import { CONTRIBUTION_XP, PRO_DAYS } from "@/lib/xp";

export type AnswerDto = {
  id: string;
  text: string;
  votes: number;
  createdAt: string;
  myVote: number;
  isAccepted: boolean;
  /** Pergjigja e profesorit rendit mbi te tjerat dhe duket ndryshe. */
  isStaff: boolean;
  author: PublicAuthor;
};

/**
 * Përgjigjet.
 *
 * E pranuara rri gjithmonë e para, me kufi të gjelbër: kush ndihmoi duhet të
 * shihet, sepse statusi këtu vjen nga ndihma, jo nga fama.
 */
export function AnswerThread({
  questionId,
  answers,
  isAuthor,
  hasAccepted,
}: {
  questionId: string;
  answers: AnswerDto[];
  isAuthor: boolean;
  hasAccepted: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("question");
  const tc = useTranslations("common");
  const guard = useTranslations("guard");
  const errors = useTranslations("errors");

  const [text, setText] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function messageFor(key: string | undefined) {
    if (!key) return tc("retry");
    if (key.startsWith("guard.")) return guard(key.replace("guard.", ""));
    if (key.startsWith("errors.")) return errors(key.replace("errors.", ""));
    return tc("retry");
  }

  function send() {
    const value = text.trim();
    if (value.length < 10) return;

    startTransition(async () => {
      const result = await answerQuestion(questionId, value);
      if (!result.ok) {
        toast.error(messageFor(result.messageKey));
        return;
      }
      toast.success(t("answerSent"));
      setText("");
      router.refresh();
    });
  }

  function accept(answerId: string) {
    startTransition(async () => {
      const result = await acceptAnswer(answerId);
      if (!result.ok) {
        toast.error(messageFor(result.messageKey));
        return;
      }
      toast.success(t("acceptedToast", { xp: CONTRIBUTION_XP.answerAccepted, days: PRO_DAYS.answerAccepted }));
      router.refresh();
    });
  }

  function vote(answerId: string, value: 1 | -1) {
    startTransition(async () => {
      await voteAnswer(answerId, value);
      router.refresh();
    });
  }

  const ordered = [...answers].sort(
    (a, b) =>
      Number(b.isAccepted) - Number(a.isAccepted) ||
      Number(b.isStaff) - Number(a.isStaff) ||
      b.votes - a.votes,
  );

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-text">
        {t("answersCount", { count: answers.length })}
      </h2>

      {answers.length === 0 ? (
        <EmptyState illustration="messages" compact title={t("emptyAnswers")} />
      ) : (
        <ul className="flex flex-col gap-3">
          {ordered.map((answer) => (
            <li key={answer.id}>
              <Card
                className={cn(
                  "flex gap-3 p-4",
                  answer.isAccepted && "border-success/40 bg-success/5",
                  !answer.isAccepted && answer.isStaff && "border-brand-500/40 bg-brand-500/5",
                )}
              >
                <div className="flex shrink-0 flex-col items-center gap-0.5">
                  <button
                    type="button"
                    aria-label={t("voteUp")}
                    aria-pressed={answer.myVote === 1}
                    onClick={() => vote(answer.id, 1)}
                    className={cn(
                      "rounded-full p-1 transition-colors hover:bg-surface-2",
                      answer.myVote === 1 ? "text-success-text" : "text-text-muted",
                    )}
                  >
                    <ArrowBigUp className="size-4" />
                  </button>
                  <span className="tabular text-sm font-semibold text-text">{answer.votes}</span>
                  <button
                    type="button"
                    aria-label={t("voteDown")}
                    aria-pressed={answer.myVote === -1}
                    onClick={() => vote(answer.id, -1)}
                    className={cn(
                      "rounded-full p-1 transition-colors hover:bg-surface-2",
                      answer.myVote === -1 ? "text-danger-text" : "text-text-muted",
                    )}
                  >
                    <ArrowBigDown className="size-4" />
                  </button>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <UserIdentityLine
                    user={answer.author}
                    size="sm"
                    inline
                    showYear={false}
                    trailing={
                      <span className="tabular text-xs text-text-muted">
                        <TimeAgo value={answer.createdAt} />
                      </span>
                    }
                  />

                  <p className="measure whitespace-pre-wrap text-sm text-text">{answer.text}</p>

                  {answer.isStaff ? (
                    <Badge variant="brand" className="w-fit">
                      <GraduationCap />
                      {t("staffAnswer")}
                    </Badge>
                  ) : null}

                  {answer.isAccepted ? (
                    <Badge variant="success" className="w-fit">
                      <CheckCircle2 />
                      {t("accepted")}
                    </Badge>
                  ) : isAuthor && !hasAccepted ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="self-start"
                      onClick={() => accept(answer.id)}
                    >
                      <Check />
                      {t("accept")}
                    </Button>
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2 border-t border-border pt-4">
        <Textarea
          autoGrow
          value={text}
          maxLength={4000}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("answerPlaceholder")}
          aria-label={t("answerPlaceholder")}
          className="min-h-20"
        />
        <Button
          size="icon"
          onClick={send}
          loading={pending}
          disabled={text.trim().length < 10}
          aria-label={t("answerSend")}
        >
          <Send />
        </Button>
      </div>
    </section>
  );
}
