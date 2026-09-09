"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Info, Layers, ListChecks, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  flashcardsForMaterial,
  quizForMaterial,
  summarizeMaterial,
} from "@/lib/actions/ai";
import type { AiResult, Flashcard, QuizQuestion } from "@/lib/ai";
import { cn } from "@/lib/utils";

type Mode = "summary" | "flashcards" | "quiz";

const MODES: { key: Mode; label: string; icon: typeof ScrollText }[] = [
  { key: "summary", label: "Përmbledhje", icon: ScrollText },
  { key: "flashcards", label: "Flashcards", icon: Layers },
  { key: "quiz", label: "Kuiz", icon: ListChecks },
];

/**
 * Ndihmësi është i heshtur: pa banner, pa premtime. Vetëm një etiketë e vogël
 * që thotë se dalja duhet verifikuar, dhe linku te burimi.
 */
export function StudyHelper({
  materialId,
  explanation,
  onClearExplanation,
}: {
  materialId: string;
  explanation?: AiResult<string> | null;
  onClearExplanation?: () => void;
}) {
  const [mode, setMode] = React.useState<Mode | null>(null);
  const [summary, setSummary] = React.useState<AiResult<string[]> | null>(null);
  const [cards, setCards] = React.useState<AiResult<Flashcard[]> | null>(null);
  const [quiz, setQuiz] = React.useState<AiResult<QuizQuestion[]> | null>(null);
  const [flipped, setFlipped] = React.useState<number | null>(null);
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const [pending, startTransition] = React.useTransition();

  function run(next: Mode) {
    setMode(next);
    startTransition(async () => {
      if (next === "summary" && !summary) {
        const result = await summarizeMaterial(materialId);
        if (!result) {
          toast.error("S'u ndërtua dot përmbledhja.");
          return;
        }
        setSummary(result);
      }
      if (next === "flashcards" && !cards) {
        const result = await flashcardsForMaterial(materialId);
        if (!result) {
          toast.error("S'u ndërtuan dot flashcards.");
          return;
        }
        setCards(result);
      }
      if (next === "quiz" && !quiz) {
        const result = await quizForMaterial(materialId);
        if (!result) {
          toast.error("S'u ndërtua dot kuizi.");
          return;
        }
        setQuiz(result);
      }
    });
  }

  const active =
    mode === "summary" ? summary : mode === "flashcards" ? cards : mode === "quiz" ? quiz : null;

  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-text">Ndihmë për të mësuar</h2>
      <p className="mt-1 text-xs text-text-muted">
        Përmbledhje, flashcards ose kuiz vetë-testues nga ky material.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {MODES.map((item) => (
          <Button
            key={item.key}
            size="sm"
            variant={mode === item.key ? "primary" : "outline"}
            onClick={() => run(item.key)}
            disabled={pending}
          >
            <item.icon />
            {item.label}
          </Button>
        ))}
      </div>

      {explanation ? (
        <div className="mt-4 rounded-md border border-border bg-surface-2 p-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-text">Shpjegim i thjeshtë</p>
            {onClearExplanation ? (
              <Button size="sm" variant="ghost" onClick={onClearExplanation}>
                Mbylle
              </Button>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-text">{explanation.data}</p>
          <Disclaimer result={explanation} />
        </div>
      ) : null}

      {mode && pending && !active ? (
        <div className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
      ) : null}

      {mode === "summary" && summary ? (
        <div className="mt-4">
          <ol className="flex flex-col gap-2">
            {summary.data.map((point, index) => (
              <li key={point} className="flex gap-2.5 text-sm text-text">
                <span className="tabular shrink-0 text-text-muted">{index + 1}.</span>
                <span>{point}</span>
              </li>
            ))}
          </ol>
          <Disclaimer result={summary} />
        </div>
      ) : null}

      {mode === "flashcards" && cards ? (
        <div className="mt-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {cards.data.map((card, index) => (
              <button
                key={card.front}
                type="button"
                onClick={() => setFlipped(flipped === index ? null : index)}
                className={cn(
                  "min-h-24 rounded-md border p-3 text-left text-sm transition-colors duration-250 ease-brand",
                  flipped === index
                    ? "border-brand-500 bg-brand-500/8 text-text"
                    : "border-border bg-surface text-text-muted hover:border-brand-500/40",
                )}
              >
                {flipped === index ? card.back : card.front}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-text-muted">Kliko një kartë për ta kthyer.</p>
          <Disclaimer result={cards} />
        </div>
      ) : null}

      {mode === "quiz" && quiz ? (
        <div className="mt-4 flex flex-col gap-4">
          {quiz.data.map((question, questionIndex) => (
            <div key={question.question} className="flex flex-col gap-2">
              <p className="text-sm font-medium text-text">{question.question}</p>
              <div className="flex flex-col gap-1.5">
                {question.options.map((option, optionIndex) => {
                  const chosen = answers[questionIndex];
                  const isChosen = chosen === optionIndex;
                  const isCorrect = optionIndex === question.correctIndex;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }))
                      }
                      className={cn(
                        "flex items-center gap-2 rounded-md border p-2.5 text-left text-sm transition-colors duration-150",
                        chosen === undefined
                          ? "border-border hover:border-brand-500/40"
                          : isCorrect
                            ? "border-success/50 bg-success/8 text-text"
                            : isChosen
                              ? "border-danger/50 bg-danger/8 text-text"
                              : "border-border opacity-60",
                      )}
                    >
                      {chosen !== undefined && isCorrect ? (
                        <Check className="size-4 shrink-0 text-success-text" />
                      ) : null}
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <Disclaimer result={quiz} />
        </div>
      ) : null}
    </Card>
  );
}

function Disclaimer({ result }: { result: AiResult<unknown> }) {
  return (
    <p className="mt-3 flex items-start gap-1.5 border-t border-border pt-3 text-xs text-text-muted">
      <Info className="mt-0.5 size-3 shrink-0" />
      <span>
        {result.disclaimer} Burimi:{" "}
        <Link href={result.source.href} className="text-brand-500 hover:underline">
          {result.source.label}
        </Link>
        {result.generated ? "" : " Përafrim i ndërtuar pa model, sepse çelësi mungon."}
      </span>
    </p>
  );
}
