"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BadgeCheck, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type SearchItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  color: string | null;
  verified?: boolean;
};

type SearchGroup = { key: string; label: string; items: SearchItem[] };

export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const t = useTranslations("search");
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [groups, setGroups] = React.useState<SearchGroup[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (query.trim().length < 2) {
      setGroups(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/kerko?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        setGroups(data.groups ?? []);
      } catch {
        // Kërkimi i anuluar nuk është gabim.
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  function goTo(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const flat = groups?.flatMap((group) => group.items) ?? [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-10 w-full items-center gap-2.5 rounded-full border border-border bg-surface px-4 text-left",
          "text-sm text-text-muted transition-colors duration-150 ease-brand",
          "hover:border-text-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
          className,
        )}
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">{t("placeholder")}</span>
        <kbd className="ml-auto hidden shrink-0 rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] text-text-muted lg:inline">
          Ctrl K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[12%] max-w-xl translate-y-0 p-0" hideClose>
          <DialogTitle className="sr-only">{t("label")}</DialogTitle>
          <DialogDescription className="sr-only">{t("hint")}</DialogDescription>

          <div className="border-b border-border p-3">
            <Input
              autoFocus
              icon={<Search />}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("placeholder")}
              aria-label={t("label")}
            />
          </div>

          <div className="max-h-[60dvh] overflow-y-auto scrollbar-thin p-2">
            {query.trim().length < 2 ? (
              <p className="px-3 py-6 text-center text-sm text-text-muted">{t("hint")}</p>
            ) : loading && !groups ? (
              <div className="flex flex-col gap-3 p-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-md" />
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : flat.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-text-muted">{t("empty")}</p>
            ) : (
              <div className="flex flex-col gap-1">
                {groups?.map((group) => (
                  <div key={group.key} className="flex flex-col">
                    <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                      {t(`groups.${group.key}`)}
                    </p>
                    {group.items.map((item) => (
                      <button
                        key={`${group.key}-${item.id}`}
                        type="button"
                        onClick={() => goTo(item.href)}
                        className="flex items-center gap-3 rounded-sm px-3 py-2 text-left transition-colors duration-150 hover:bg-surface-2"
                      >
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm text-text">{item.title}</span>
                            {item.verified ? (
                              <BadgeCheck className="size-3.5 shrink-0 text-brand-500" />
                            ) : null}
                          </span>
                          {item.subtitle ? (
                            <span className="truncate text-xs text-text-muted">
                              {item.subtitle}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
