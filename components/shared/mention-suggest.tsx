"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { suggestMentions, type MentionSuggestion } from "@/lib/actions/mentions";
import { mentionAtCaret } from "@/lib/mentions";
import { cn } from "@/lib/utils";

/**
 * Sugjerimet për @ poshtë një fushe teksti.
 *
 * Ndjek kursorin: kur fjala para tij nis me @, del lista e njerëzve; shigjetat
 * lëvizin, Enter ose Tab e zgjedh, Escape e mbyll. Zgjedhja e zëvendëson fjalën
 * me `@username ` dhe kursori mbetet pas saj.
 */
export function MentionSuggest({
  inputRef,
  value,
  onChange,
  className,
}: {
  inputRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  value: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  const t = useTranslations("mentions");
  const [token, setToken] = React.useState<{ start: number; query: string } | null>(null);
  const [items, setItems] = React.useState<MentionSuggestion[]>([]);
  const [active, setActive] = React.useState(0);

  // Fjala @ te kursori, sa herë ndryshon teksti ose lëviz kursori.
  React.useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const update = () => setToken(mentionAtCaret(input.value, input.selectionStart ?? input.value.length));
    update();
    input.addEventListener("keyup", update);
    input.addEventListener("click", update);
    input.addEventListener("blur", () => window.setTimeout(() => setToken(null), 150));
    return () => {
      input.removeEventListener("keyup", update);
      input.removeEventListener("click", update);
    };
  }, [inputRef, value]);

  React.useEffect(() => {
    if (!token) {
      setItems([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void suggestMentions(token.query).then((rows) => {
        if (!cancelled) {
          setItems(rows);
          setActive(0);
        }
      });
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [token]);

  const pick = React.useCallback(
    (item: MentionSuggestion) => {
      const input = inputRef.current;
      if (!token || !input) return;
      const caret = input.selectionStart ?? value.length;
      const next = `${value.slice(0, token.start)}@${item.username} ${value.slice(caret)}`;
      onChange(next);
      setToken(null);
      const position = token.start + item.username.length + 2;
      window.requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(position, position);
      });
    },
    [inputRef, onChange, token, value],
  );

  // Tastiera: shigjetat dhe Enter punojnë mbi listën vetëm kur ajo është e hapur.
  React.useEffect(() => {
    const input = inputRef.current;
    if (!input || !token || items.length === 0) return;
    const onKey = (event: Event) => {
      const key = (event as KeyboardEvent).key;
      if (key === "ArrowDown") setActive((index) => (index + 1) % items.length);
      else if (key === "ArrowUp") setActive((index) => (index - 1 + items.length) % items.length);
      else if (key === "Enter" || key === "Tab") pick(items[active]);
      else if (key === "Escape") setToken(null);
      else return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    input.addEventListener("keydown", onKey, true);
    return () => input.removeEventListener("keydown", onKey, true);
  }, [inputRef, token, items, active, pick]);

  if (!token || items.length === 0) return null;

  return (
    <ul
      role="listbox"
      aria-label={t("label")}
      className={cn("z-50 flex max-h-60 w-72 max-w-full flex-col overflow-y-auto rounded-card border border-border bg-surface-solid p-1 shadow-lifted", className)}
      data-mention-suggest
    >
      {items.map((item, index) => (
        <li key={item.username} role="option" aria-selected={index === active}>
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              pick(item);
            }}
            className={cn("flex w-full items-center gap-2.5 rounded-control px-2 py-1.5 text-left", index === active ? "bg-surface-2" : "hover:bg-surface-2")}
            data-mention-option={item.username}
          >
            <Avatar name={item.name} src={item.avatar} size="xs" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-text">{item.name}</span>
              <span className="truncate text-xs text-text-muted">@{item.username}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
