"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Question = { question: string; options: string[]; answer: number };

export function LessonQuiz({ questions }: { questions: Question[] }) {
  const t = useTranslations("courses");
  const [picked, setPicked] = React.useState<(number | null)[]>(() => questions.map(() => null));
  const [checked, setChecked] = React.useState(false);

  if (questions.length === 0) {
    return <p className="text-sm text-text-muted">{t("quizEmpty")}</p>;
  }

  const score = picked.filter((choice, index) => choice === questions[index].answer).length;
  const allAnswered = picked.every((choice) => choice !== null);

  return (
    <div className="flex flex-col gap-5">
      {questions.map((question, qIndex) => (
        <fieldset key={qIndex} className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-text">
            {qIndex + 1}. {question.question}
          </legend>

          {question.options.map((option, oIndex) => {
            const chosen = picked[qIndex] === oIndex;
            const correct = question.answer === oIndex;

            return (
              <label
                key={oIndex}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors duration-150",
                  !checked && chosen && "border-brand-500 bg-brand-500/8 text-text",
                  !checked && !chosen && "border-border text-text-muted hover:text-text",
                  checked && correct && "border-success/50 bg-success/8 text-text",
                  checked && chosen && !correct && "border-danger/50 bg-danger/8 text-text",
                  checked && !chosen && !correct && "border-border text-text-muted",
                )}
              >
                <input
                  type="radio"
                  name={`q-${qIndex}`}
                  checked={chosen}
                  disabled={checked}
                  onChange={() =>
                    setPicked((current) => current.map((value, i) => (i === qIndex ? oIndex : value)))
                  }
                  className="accent-brand-500"
                />
                <span className="flex-1">{option}</span>
                {checked && correct ? <CheckCircle2 className="size-4 text-success" aria-hidden /> : null}
                {checked && chosen && !correct ? <XCircle className="size-4 text-danger" aria-hidden /> : null}
              </label>
            );
          })}
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        {checked ? (
          <>
            <p className="text-sm font-medium text-text" role="status">
              {t("quizScore", { score, total: questions.length })}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPicked(questions.map(() => null));
                setChecked(false);
              }}
            >
              {t("quizRetry")}
            </Button>
          </>
        ) : (
          <Button size="sm" disabled={!allAnswered} onClick={() => setChecked(true)}>
            {t("quizCheck")}
          </Button>
        )}
      </div>
    </div>
  );
}
