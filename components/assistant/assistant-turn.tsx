"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, FileText, RotateCw } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { cn } from "@/lib/utils";
import { AnswerText } from "./answer-text";
import type { Turn } from "./types";

/** Ora e mesazhit. Paneli hapet vetëm në shfletues, prandaj ora nuk prish hidratimin. */
function clock(value: string, locale: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString(locale === "en" ? "en-GB" : "sq-AL", { hour: "2-digit", minute: "2-digit" });
}

export function AssistantTurn({
  turn,
  streaming = false,
  onRetry,
}: {
  turn: Turn;
  streaming?: boolean;
  onRetry?: () => void;
}) {
  const t = useTranslations("assistantDock");
  const ta = useTranslations("assistant");
  const locale = useLocale();
  const mine = turn.role === "user";
  const images = turn.previews?.length ? turn.previews : turn.images.map((id) => `/api/media/${id}`);

  return (
    <div
      data-turn={turn.role}
      data-streaming={streaming || undefined}
      aria-busy={streaming || undefined}
      className={cn("animate-rise flex flex-col gap-1", mine ? "items-end" : "items-start")}
    >
      <div
        className={cn(
          "flex max-w-full flex-col gap-2 rounded-2xl px-3 py-2",
          mine
            ? "max-w-[85%] rounded-br-md bg-brand-500 text-brand-contrast"
            : "w-full rounded-bl-md bg-surface-2 text-text",
        )}
      >
        {images.length > 0 ? (
          <div className={cn("grid gap-1.5", images.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
            {images.map((src) => (
              <a
                key={src}
                href={src}
                target="_blank"
                rel="noreferrer"
                aria-label={t("imagePreview")}
                className="block overflow-hidden rounded-lg"
              >
                {src.startsWith("blob:") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" className="max-h-48 w-full object-cover" />
                ) : (
                  <MediaImage src={src} alt="" width={320} height={240} className="max-h-48 w-full object-cover" />
                )}
              </a>
            ))}
          </div>
        ) : null}

        {turn.content ? (
          mine ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{turn.content}</p>
          ) : (
            <AnswerText text={turn.content} />
          )
        ) : null}

        {!mine && turn.sources.length > 0 ? (
          <div className="flex flex-col gap-1 border-t border-border pt-2">
            <p className="text-[11px] font-medium text-text-muted">{ta("sources")}</p>
            {turn.sources.map((source) => (
              <Link
                key={`${source.materialId}-${source.chunk}`}
                href={`/materialet/${source.materialId}`}
                className="flex items-center gap-1.5 text-xs text-brand-600 hover:underline dark:text-brand-500"
              >
                <FileText className="size-3 shrink-0" />
                <span className="truncate">{source.title}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {turn.failed ? (
        <div className="flex items-center gap-2 text-xs text-danger-text" role="alert">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          <span>{t("unavailable")}</span>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 font-medium text-text transition-colors duration-150 hover:bg-surface-2"
            >
              <RotateCw className="size-3" aria-hidden />
              {t("retry")}
            </button>
          ) : null}
        </div>
      ) : streaming ? null : (
        <time
          dateTime={turn.createdAt}
          className="tabular px-1 text-[10px] text-text-muted"
          title={t("messageTime", { time: clock(turn.createdAt, locale) })}
        >
          {clock(turn.createdAt, locale)}
        </time>
      )}
    </div>
  );
}
