"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Image as ImageIcon, MessageSquareText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { ConversationItem } from "./types";

type Group = "today" | "yesterday" | "thisWeek" | "older";

function groupOf(value: string, now: Date): Group {
  const date = new Date(value);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const day = 86_400_000;
  if (date >= start) return "today";
  if (date.getTime() >= start.getTime() - day) return "yesterday";
  if (date.getTime() >= start.getTime() - 6 * day) return "thisWeek";
  return "older";
}

function stamp(value: string, group: Group, locale: string) {
  const date = new Date(value);
  const tag = locale === "en" ? "en-GB" : "sq-AL";
  if (group === "today" || group === "yesterday") {
    return date.toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString(tag, { day: "numeric", month: "short" });
}

/**
 * Historiku i bisedave.
 *
 * Lista vjen nga serveri, tridhjetë në herë, pa mesazhet: vetëm titulli, koha
 * dhe një rresht nga i fundit. Biseda e hapur theksohet, dhe fshirja kërkon një
 * prekje të dytë, sepse nuk kthehet.
 */
export function AssistantHistory({
  activeId,
  onOpen,
  onNew,
  onDeleted,
}: {
  activeId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDeleted: (id: string) => void;
}) {
  const t = useTranslations("assistantDock");
  const locale = useLocale();
  const [items, setItems] = React.useState<ConversationItem[] | null>(null);
  const [next, setNext] = React.useState<string | null>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [confirming, setConfirming] = React.useState<string | null>(null);

  const load = React.useCallback(async (before?: string) => {
    const response = await fetch(`/api/asistenti/biseda${before ? `?before=${encodeURIComponent(before)}` : ""}`);
    if (!response.ok) throw new Error(String(response.status));
    return (await response.json()) as { items: ConversationItem[]; next: string | null };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setNext(data.next);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function more() {
    if (!next) return;
    setLoadingMore(true);
    try {
      const data = await load(next);
      setItems((current) => [...(current ?? []), ...data.items]);
      setNext(data.next);
    } finally {
      setLoadingMore(false);
    }
  }

  async function remove(id: string) {
    const previous = items;
    setItems((current) => current?.filter((item) => item.id !== id) ?? null);
    setConfirming(null);
    const response = await fetch(`/api/asistenti/biseda/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setItems(previous);
      toast.error(t("unavailable"));
      return;
    }
    toast.success(t("deleted"));
    onDeleted(id);
  }

  if (items === null) {
    return (
      <div className="flex flex-col gap-2 p-3" aria-busy>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex flex-col gap-1.5 rounded-xl p-2.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-500">
          <MessageSquareText className="size-5" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-text">{t("historyEmpty")}</p>
          <p className="measure text-xs text-text-muted">{t("historyEmptyBody")}</p>
        </div>
        <Button size="sm" onClick={onNew}>
          <Plus />
          {t("newChat")}
        </Button>
      </div>
    );
  }

  const now = new Date();
  const order: Group[] = ["today", "yesterday", "thisWeek", "older"];
  const grouped = order
    .map((group) => ({ group, rows: items.filter((item) => groupOf(item.updatedAt, now) === group) }))
    .filter((section) => section.rows.length > 0);

  return (
    <div className="flex flex-col gap-3 p-2" data-ai-history>
      {grouped.map(({ group, rows }) => (
        <section key={group} className="flex flex-col gap-0.5">
          <h3 className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            {t(group)}
          </h3>
          {rows.map((item) => (
            <div
              key={item.id}
              data-conversation={item.id}
              className={cn(
                "group relative flex items-start gap-2 rounded-xl px-2.5 py-2 transition-colors duration-150",
                item.id === activeId ? "bg-brand-500/10" : "hover:bg-surface-2",
              )}
            >
              <button
                type="button"
                onClick={() => onOpen(item.id)}
                className="flex min-w-0 flex-1 flex-col gap-0.5 text-left focus-visible:outline-none"
              >
                <span className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{item.title}</span>
                  <span className="tabular shrink-0 text-[10px] text-text-muted">
                    {stamp(item.updatedAt, group, locale)}
                  </span>
                </span>
                <span className="flex items-center gap-1 truncate text-xs text-text-muted">
                  {item.previewImage ? <ImageIcon className="size-3 shrink-0" aria-hidden /> : null}
                  <span className="truncate">{item.preview || (item.previewImage ? t("imageOnly") : "")}</span>
                </span>
              </button>

              {confirming === item.id ? (
                <span className="animate-rise flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="rounded-full px-2 py-1 text-[11px] font-medium text-danger-text transition-colors hover:bg-danger-50"
                  >
                    {t("deleteConfirm")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className="rounded-full px-2 py-1 text-[11px] text-text-muted transition-colors hover:bg-surface-2"
                  >
                    {t("cancel")}
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(item.id)}
                  aria-label={t("deleteChat")}
                  title={t("deleteChat")}
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-text-muted opacity-100 transition-all duration-150 hover:bg-surface hover:text-danger-text sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </section>
      ))}

      {next ? (
        <Button variant="ghost" size="sm" onClick={more} loading={loadingMore} className="self-center">
          {t("loadMore")}
        </Button>
      ) : null}
    </div>
  );
}
