"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Highlighter,
  NotebookPen,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export type DocumentPage = { number: number; heading: string; paragraphs: string[] };

/**
 * Shikuesi i dokumentit brenda platformës. Shënimet personale dhe nënvizimet
 * ruhen vetëm në shfletuesin e këtij përdoruesi, sepse janë private dhe nuk
 * kanë pse të kalojnë te serveri.
 */
export function DocumentViewer({
  materialId,
  title,
  pages,
  onExplain,
}: {
  materialId: string;
  title: string;
  pages: DocumentPage[];
  onExplain?: (paragraph: string) => void;
}) {
  const [index, setIndex] = React.useState(0);
  const [notes, setNotes] = React.useState<Record<number, string>>({});
  const [highlights, setHighlights] = React.useState<string[]>([]);
  const storageKey = `studentet-ks:notes:${materialId}`;

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          notes?: Record<number, string>;
          highlights?: string[];
        };
        setNotes(parsed.notes ?? {});
        setHighlights(parsed.highlights ?? []);
      }
    } catch {
      // Shfletuesi mund t'i ketë bllokuar të dhënat e faqes; nuk është gabim.
    }
  }, [storageKey]);

  const persist = React.useCallback(
    (nextNotes: Record<number, string>, nextHighlights: string[]) => {
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ notes: nextNotes, highlights: nextHighlights }),
        );
      } catch {
        // Injorohet me qëllim.
      }
    },
    [storageKey],
  );

  const page = pages[index];
  const noteValue = notes[page.number] ?? "";

  function toggleHighlight(paragraph: string) {
    const next = highlights.includes(paragraph)
      ? highlights.filter((item) => item !== paragraph)
      : [...highlights, paragraph];
    setHighlights(next);
    persist(notes, next);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <p className="truncate text-sm font-medium text-text">{title}</p>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Faqja e mëparshme"
              disabled={index === 0}
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
            >
              <ChevronLeft />
            </Button>
            <span className="tabular text-xs text-text-muted">
              {page.number} / {pages.length}
            </span>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Faqja tjetër"
              disabled={index === pages.length - 1}
              onClick={() => setIndex((value) => Math.min(pages.length - 1, value + 1))}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>

        <article className="flex flex-col gap-4 bg-surface px-5 py-6 sm:px-8 sm:py-10">
          <h3 className="font-serif text-xl text-text">{page.heading}</h3>
          {page.paragraphs.map((paragraph) => {
            const marked = highlights.includes(paragraph);
            return (
              <div key={paragraph} className="group flex flex-col gap-1.5">
                <p
                  className={cn(
                    "measure text-sm leading-relaxed text-text transition-colors duration-150",
                    marked && "rounded-sm bg-warning/20 px-1",
                  )}
                >
                  {paragraph}
                </p>
                <div className="flex gap-1 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
                  <Button size="sm" variant="ghost" onClick={() => toggleHighlight(paragraph)}>
                    <Highlighter />
                    {marked ? "Hiq nënvizimin" : "Nënvizo"}
                  </Button>
                  {onExplain ? (
                    <Button size="sm" variant="ghost" onClick={() => onExplain(paragraph)}>
                      <NotebookPen />
                      Shpjegoje thjesht
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </article>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-text">
            Shënimet e tua për faqen {page.number}
          </h3>
          {noteValue ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const next = { ...notes };
                delete next[page.number];
                setNotes(next);
                persist(next, highlights);
                toast.success("E fshive shënimin.");
              }}
            >
              <Trash2 />
              Fshije
            </Button>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-text-muted">
          Ruhen vetëm në këtë shfletues. Askush tjetër nuk i sheh.
        </p>
        <Textarea
          className="mt-3"
          autoGrow
          value={noteValue}
          placeholder="Shkruaj çfarë duhet mbajtur mend nga kjo faqe."
          onChange={(event) => {
            const next = { ...notes, [page.number]: event.target.value };
            setNotes(next);
            persist(next, highlights);
          }}
        />
      </Card>

      {highlights.length > 0 ? (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-text">
            Nënvizimet ({highlights.length})
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {highlights.map((highlight) => (
              <li
                key={highlight}
                className="rounded-md border-l-2 border-warning bg-warning/8 px-3 py-2 text-sm text-text"
              >
                {highlight}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
