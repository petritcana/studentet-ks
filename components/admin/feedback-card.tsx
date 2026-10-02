"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bot, Bug, CheckCircle2, Eye, Lightbulb, Monitor, RotateCcw, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MediaImage } from "@/components/ui/media-image";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { updateFeedback } from "@/lib/actions/feedback";
import type { MediaRef } from "@/lib/media";
import { cn } from "@/lib/utils";

export type FeedbackView = {
  id: string;
  kind: "bug" | "suggestion";
  message: string;
  path: string;
  device: Record<string, string | number | boolean>;
  errors: string[];
  media: MediaRef[];
  status: "new" | "seen" | "resolved";
  source: "user" | "bot";
  adminNote: string;
  /** E formatuar në server. */
  when: string;
  user: { name: string; username: string; avatar: string | null };
};

/** Një raport te paneli i adminit, me gjendjen dhe shënimin e adminit. */
export function FeedbackCard({ item }: { item: FeedbackView }) {
  const t = useTranslations("adminFeedback");
  const tf = useTranslations("feedback");
  const router = useRouter();
  const [note, setNote] = React.useState(item.adminNote);
  const [pending, startTransition] = React.useTransition();

  function setStatus(status: FeedbackView["status"]) {
    startTransition(async () => {
      const result = await updateFeedback({ id: item.id, status, note });
      if (!result.ok) {
        toast.error(t("error"));
        return;
      }
      router.refresh();
    });
  }

  const KindIcon = item.kind === "bug" ? Bug : Lightbulb;
  const device = [item.device.browser, item.device.system, item.device.screen, item.device.theme]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className={cn("flex flex-col gap-3 p-4", item.status === "resolved" && "opacity-75")} data-feedback-item={item.id} data-status={item.status}>
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1", item.kind === "bug" ? "bg-danger-50 text-danger-text" : "bg-brand-50 text-brand-500")}>
          <KindIcon className="size-3.5" aria-hidden />
          {tf(`kind_${item.kind}`)}
        </span>
        {item.source === "bot" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-text-muted">
            <Bot className="size-3.5" aria-hidden />
            {t("bot")}
          </span>
        ) : null}
        <span
          className={cn(
            "rounded-full px-2.5 py-1",
            item.status === "new" && "bg-warning-50 text-warning-text",
            item.status === "seen" && "bg-surface-2 text-text-muted",
            item.status === "resolved" && "bg-success-50 text-success-text",
          )}
        >
          {t(`status_${item.status}`)}
        </span>
        <span className="ml-auto font-medium text-text-dim">{item.when}</span>
      </div>

      <div className="flex items-center gap-2.5">
        <Avatar name={item.user.name} src={item.user.avatar} size="sm" />
        <span className="flex min-w-0 flex-col">
          <Link href={`/u/${item.user.username}`} className="truncate text-sm font-semibold text-text hover:underline">
            {item.user.name}
          </Link>
          <span className="truncate text-xs text-text-muted">@{item.user.username}</span>
        </span>
      </div>

      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-text">{item.message}</p>

      {item.media.length > 0 ? (
        <a href={`/api/media/${item.media[0].id}`} target="_blank" rel="noreferrer" className="w-fit">
          <MediaImage src={`/api/media/${item.media[0].id}`} alt={t("screenshot")} width={320} height={200} className="max-h-56 w-auto rounded-control border border-border" />
        </a>
      ) : null}

      <div className="flex flex-col gap-1 rounded-control border border-border bg-surface-2 px-3 py-2.5 text-xs text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Eye className="size-3.5" aria-hidden />
          {t("page")}:{" "}
          <Link href={item.path} className="font-semibold text-brand-500 hover:underline" data-feedback-path>
            {item.path}
          </Link>
        </span>
        {device ? (
          <span className="inline-flex items-center gap-1.5">
            <Monitor className="size-3.5" aria-hidden />
            {device}
          </span>
        ) : null}
        {item.errors.length > 0 ? (
          <details className="mt-1">
            <summary className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-danger-text">
              <TriangleAlert className="size-3.5" aria-hidden />
              {t("errors", { count: item.errors.length })}
            </summary>
            <ul className="mt-1.5 flex flex-col gap-1">
              {item.errors.map((error, index) => (
                <li key={index} className="break-all rounded-[8px] bg-surface px-2 py-1 font-mono text-[11px] text-text">
                  {error}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-text-muted">{t("note")}</span>
        <Textarea value={note} onChange={(event) => setNote(event.target.value.slice(0, 1000))} placeholder={t("notePlaceholder")} className="min-h-16" />
      </label>

      <div className="flex flex-wrap gap-2">
        {item.status !== "resolved" ? (
          <Button size="sm" onClick={() => setStatus("resolved")} loading={pending} data-feedback-resolve>
            <CheckCircle2 />
            {t("resolve")}
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setStatus("new")} loading={pending}>
            <RotateCcw />
            {t("reopen")}
          </Button>
        )}
        {item.status === "new" ? (
          <Button size="sm" variant="secondary" onClick={() => setStatus("seen")} disabled={pending} data-feedback-seen>
            <Eye />
            {t("markSeen")}
          </Button>
        ) : null}
        {note !== item.adminNote ? (
          <Button size="sm" variant="ghost" onClick={() => setStatus(item.status)} disabled={pending}>
            {t("saveNote")}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
