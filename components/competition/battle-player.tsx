"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Clock, RotateCw, Swords, Trophy, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { answerQuestion, findOpponentFor, respondToChallenge, startBattle } from "@/lib/actions/competition";
import type { BattleView } from "@/lib/competition/battles";
import { CATEGORY_ICON, isCategory, type CompetitionCategory } from "@/lib/competition/categories";
import { cn } from "@/lib/utils";
import { ChallengeDialog } from "./challenge-dialog";

/**
 * Loja e një beteje.
 *
 * Faqja nuk llogarit asgjë: dërgon zgjedhjen, merr prej serverit nëse ishte e
 * saktë, dhe pyet për gjendjen çdo tri sekonda, që kundërshtari dhe rezultati të
 * dalin pa rifreskim. Kohëmatësi këtu është vetëm pamje: afati i vërtetë
 * kontrollohet te serveri.
 */
export function BattlePlayer({ initial, meId }: { initial: BattleView; meId: string }) {
  const router = useRouter();
  const t = useTranslations("competition");
  const errors = useTranslations("errors");
  const [view, setView] = React.useState(initial);
  const [feedback, setFeedback] = React.useState<{ choice: number; correctIndex: number } | null>(null);
  const [seconds, setSeconds] = React.useState<number | null>(initial.me?.secondsLeft ?? null);
  const [pending, startTransition] = React.useTransition();

  const category = (isCategory(view.category) ? view.category : "general") as CompetitionCategory;
  const categoryName = view.mode === "daily" ? t("dailyTitle") : t(`cat_${category}`);

  const refresh = React.useCallback(async () => {
    const response = await fetch(`/api/gara/beteja/${view.id}`, { cache: "no-store" });
    if (!response.ok) return;
    const next = (await response.json()) as BattleView;
    setView(next);
    setSeconds(next.me?.secondsLeft ?? null);
  }, [view.id]);

  // Pyetja për gjendjen: vetëm kur ka diçka që mund të ndryshojë nga ana tjetër.
  const waiting =
    view.status !== "finished" &&
    view.status !== "declined" &&
    view.status !== "expired" &&
    !(view.me && !view.me.finished && view.current);
  React.useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [waiting, refresh]);

  // Kohëmatësi i pamjes. Kur mbaron, serveri e mbyll lojën dhe faqja e merr gjendjen.
  const playing = Boolean(view.me && !view.me.finished && view.current);
  React.useEffect(() => {
    if (!playing || seconds === null) return;
    if (seconds <= 0) {
      void refresh();
      return;
    }
    const timer = window.setTimeout(() => setSeconds((value) => (value === null ? null : value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [playing, seconds, refresh]);

  function explain(key?: string) {
    const code = key ?? "";
    toast.error(code.startsWith("competition.") ? t(code.replace("competition.", "")) : errors("generic"));
  }

  function respond(accept: boolean) {
    startTransition(async () => {
      const result = await respondToChallenge(view.id, accept);
      if (!result.ok) return explain(result.messageKey);
      toast.success(t(accept ? "challengeAccepted" : "challengeDeclined"));
      await refresh();
    });
  }

  function start() {
    startTransition(async () => {
      const result = await startBattle(view.id);
      if (!result.ok) return explain(result.messageKey);
      await refresh();
    });
  }

  function choose(choice: number) {
    const question = view.current;
    if (!question || feedback || pending) return;
    startTransition(async () => {
      const result = await answerQuestion(view.id, question.id, choice);
      if (!result.ok) {
        explain(result.messageKey);
        await refresh();
        return;
      }
      setFeedback({ choice, correctIndex: result.correctIndex ?? -1 });
      // Një çast që studenti ta shohë nëse e qëlloi, pastaj pyetja tjetër.
      window.setTimeout(async () => {
        setFeedback(null);
        await refresh();
        if (result.done) router.refresh();
      }, 800);
    });
  }

  function another() {
    startTransition(async () => {
      const result = await findOpponentFor(category);
      if (!result.ok || !result.battleId) return explain(result.messageKey);
      router.push(`/gara/beteja/${result.battleId}`);
    });
  }

  const opponent = view.opponent;
  const finished = view.status === "finished";

  return (
    <div className="flex flex-col gap-4" data-battle={view.id} data-status={view.status}>
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className="grid size-11 place-items-center rounded-2xl bg-brand-500/10 text-xl" aria-hidden>
          {view.mode === "daily" ? "🧠" : CATEGORY_ICON[category]}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {t(view.mode === "daily" ? "modeDaily" : view.mode === "event" ? "modeEvent" : view.mode === "challenge" ? "modeChallenge" : "modeRandom")}
          </p>
          <h1 className="truncate text-lg font-semibold text-text">{categoryName}</h1>
        </div>
        {playing && seconds !== null ? (
          <span
            data-timer
            className={cn(
              "tabular inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
              seconds <= 10 ? "bg-warning/15 text-warning-text" : "bg-surface-2 text-text",
            )}
          >
            <Clock className="size-4" aria-hidden />
            {t("secondsLeft", { seconds: Math.max(0, seconds) })}
          </span>
        ) : null}
      </Card>

      {opponent ? (
        <Card className="flex items-center gap-3 p-3" data-opponent>
          <Avatar name={opponent.name} src={opponent.avatar} size="sm" />
          <span className="min-w-0 flex-1 truncate text-sm text-text">
            {opponent.finished
              ? t("opponentDone", { name: opponent.name })
              : opponent.answered > 0
                ? t("opponentProgress", { name: opponent.name, answered: opponent.answered, total: view.total })
                : t("opponentNotStarted", { name: opponent.name })}
          </span>
          {view.me ? (
            <span className="tabular text-xs text-text-muted">{t("yourProgress", { answered: view.me.answered, total: view.total })}</span>
          ) : null}
        </Card>
      ) : null}

      {view.status === "declined" || view.status === "expired" ? (
        <Card className="p-6 text-center text-sm text-text-muted">{t(view.status === "declined" ? "declined" : "expired")}</Card>
      ) : null}

      {view.canRespond ? (
        <Card className="flex flex-col items-center gap-4 p-6 text-center">
          <Swords className="size-8 text-brand-600 dark:text-brand-500" aria-hidden />
          <p className="text-sm text-text">
            {t("statusIncoming", { name: view.challenger?.name ?? "", category: categoryName })}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => respond(true)} loading={pending}>
              {t("accept")}
            </Button>
            <Button variant="secondary" onClick={() => respond(false)} disabled={pending}>
              {t("decline")}
            </Button>
          </div>
        </Card>
      ) : null}

      {view.canStart && !view.canRespond ? (
        <Card className="flex flex-col items-center gap-4 p-6 text-center">
          {view.status === "pending" && view.role === "challenger" ? (
            <p className="text-sm text-text-muted">{t("statusPending", { name: opponent?.name ?? "" })}</p>
          ) : null}
          <p className="text-sm text-text-muted">{t("startHint", { count: view.total, seconds: view.timeLimitSec })}</p>
          <Button size="md" onClick={start} loading={pending} data-start>
            {view.mode === "daily" ? t("dailyStart") : t("start")}
          </Button>
        </Card>
      ) : null}

      {playing && view.current ? (
        <Card className="animate-rise flex flex-col gap-4 p-5" data-question={view.current.id}>
          <p className="tabular text-xs font-medium text-text-muted">
            {t("questionOf", { n: (view.me?.answered ?? 0) + 1, total: view.total })}
          </p>
          <h2 className="text-lg font-semibold leading-snug text-text">{view.current.prompt}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {view.current.options.map((option, index) => {
              const isChoice = feedback?.choice === index;
              const isRight = feedback && feedback.correctIndex === index;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => choose(index)}
                  disabled={Boolean(feedback) || pending}
                  data-option={index}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all duration-150",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
                    !feedback && "border-border bg-surface hover:-translate-y-0.5 hover:border-brand-500/60 hover:shadow-soft",
                    isRight && "border-success bg-success/10 text-success-text",
                    isChoice && !isRight && "border-danger bg-danger/10 text-danger-text",
                    feedback && !isChoice && !isRight && "border-border opacity-60",
                  )}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs text-text-muted">
                    {isRight ? <Check className="size-3.5" /> : isChoice ? <X className="size-3.5" /> : String.fromCharCode(65 + index)}
                  </span>
                  {option}
                </button>
              );
            })}
          </div>
        </Card>
      ) : null}

      {view.me?.finished ? (
        <Card className="flex flex-col items-center gap-3 p-6 text-center" data-result>
          {finished && view.winnerId ? (
            <p className="flex items-center gap-2 text-xl font-semibold text-text">
              <Trophy className="size-6 text-accent-500" aria-hidden />
              {view.winnerId === meId ? t("youWon") : t("theyWon", { name: opponent?.name ?? "" })}
            </p>
          ) : finished && opponent ? (
            <p className="text-xl font-semibold text-text">{t("draw")}</p>
          ) : null}

          <p className="tabular text-3xl font-bold text-text" data-score>
            {view.me.correct ?? 0}/{view.total}
          </p>
          {opponent && opponent.correct !== null ? (
            <p className="tabular text-sm text-text-muted">
              {opponent.name}: {opponent.correct}/{view.total}
            </p>
          ) : null}

          {!finished && opponent ? <p className="text-sm text-text-muted">{t("waitingForOpponent")}</p> : null}
          {!finished && !opponent && view.mode === "random" ? (
            <p className="text-sm text-text-muted">{t("waitingForMatch")}</p>
          ) : null}
          {view.community ? (
            <p className="text-sm text-text-muted">
              {t("vsCommunity", { average: view.community.average, total: view.total, players: view.community.players })}
            </p>
          ) : null}

          {view.mode === "challenge" || view.mode === "random" ? (
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <ChallengeDialog defaultCategory={category} />
              <Button variant="secondary" onClick={another} loading={pending}>
                <RotateCw />
                {t("playAgain")}
              </Button>
            </div>
          ) : view.mode === "daily" ? (
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <p className="w-full text-xs text-text-muted">{t("dailyComeBack")}</p>
              <ChallengeDialog defaultCategory="general" />
            </div>
          ) : null}
        </Card>
      ) : null}

      {view.review.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-text">{t("review")}</h2>
          {view.review.map((item, index) => (
            <Card key={item.question.id} className="flex flex-col gap-1.5 p-4" data-review={item.correct ? "correct" : "wrong"}>
              <p className="text-sm font-medium text-text">
                {index + 1}. {item.question.prompt}
              </p>
              <p className={cn("text-xs", item.correct ? "text-success-text" : "text-danger-text")}>
                {item.correct ? <Check className="mr-1 inline size-3.5" aria-hidden /> : <X className="mr-1 inline size-3.5" aria-hidden />}
                {t("yourChoice")}: {item.choice >= 0 ? item.question.options[item.choice] : "·"}
              </p>
              {!item.correct ? (
                <p className="text-xs text-text-muted">
                  {t("rightAnswer")}: {item.question.options[item.correctIndex]}
                </p>
              ) : null}
            </Card>
          ))}
        </section>
      ) : null}

      <Link href="/gara" className="self-center text-sm text-text-muted underline-offset-4 hover:text-text hover:underline">
        {t("backToCompetition")}
      </Link>
    </div>
  );
}
