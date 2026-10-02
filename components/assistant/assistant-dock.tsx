"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, FileText, History, Maximize2, Minimize2, Minus, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { AiSource } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import { AssistantComposer } from "./assistant-composer";
import { AssistantHistory } from "./assistant-history";
import { AssistantMark } from "./assistant-mark";
import { AssistantTurn } from "./assistant-turn";
import type { Turn } from "./types";

/** Konteksti nxirret nga rruga aktuale, pa e pyetur faqen. */
function readContext(pathname: string): { kind: "material" | "course" | "job"; id: string } | null {
  const material = pathname.match(/^\/materialet\/([^/]+)$/);
  if (material && material[1] !== "ngarko") return { kind: "material", id: material[1] };

  const course = pathname.match(/^\/lenda\/([^/]+)$/);
  if (course) return { kind: "course", id: course[1] };

  const job = pathname.match(/^\/(?:pune|karriera)\/([^/]+)$/);
  if (job && job[1] !== "cv") return { kind: "job", id: job[1] };

  return null;
}

type ServerMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  images: string[];
  sources: AiSource[];
};

/**
 * Asistenti i dokuar.
 *
 * Një bisedë e vazhdueshme me Groq, e ruajtur në bazë: «Bisedë e re» nis një fill
 * të pastër, «Historiku» i hap të vjetrat. Studenti shkruan, ngjit ose zgjedh një
 * foto, dhe pyet me fjalët e veta: «shpjegoje thjesht», «bëj një kuiz» nuk janë
 * butona, janë kërkesa si çdo tjetër.
 */
export function AssistantDock({ isPro, label }: { isPro: boolean; label: string | null }) {
  const isMock = label === null;
  const pathname = usePathname();
  const t = useTranslations("assistantDock");
  const ta = useTranslations("assistant");
  const errors = useTranslations("errors");

  const [open, setOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [view, setView] = React.useState<"chat" | "history">("chat");
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [threadId, setThreadId] = React.useState<string | null>(null);
  const [olderAvailable, setOlderAvailable] = React.useState(false);
  const [loadingThread, setLoadingThread] = React.useState(false);
  const [loadingOlder, setLoadingOlder] = React.useState(false);
  const [context, setContext] = React.useState<ReturnType<typeof readContext>>(null);
  const [contextTitle, setContextTitle] = React.useState<string | null>(null);
  const [contextDismissed, setContextDismissed] = React.useState(false);
  const [lockedCount, setLockedCount] = React.useState(0);
  const [remaining, setRemaining] = React.useState<number | null>(null);
  const [pending, setPending] = React.useState(false);
  // Përgjigjja që po rrjedh ende: ora del kur mbaron, dhe testet dinë kur të lexojnë.
  const [streamingId, setStreamingId] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const keepPosition = React.useRef<number | null>(null);

  // Konteksti ndjek rrugën. Kur studenti ndërron faqe, chip-i përditësohet.
  React.useEffect(() => {
    const next = readContext(pathname);
    setContext(next);
    setContextDismissed(false);
    setContextTitle(null);

    if (!next) return;
    let cancelled = false;

    // Titulli i vërtetë, sepse një copë id-je nuk i thotë asgjë studentit.
    (async () => {
      const response = await fetch(`/api/kontekst?lloji=${next.kind}&id=${next.id}`);
      if (!response.ok) return;
      const data = await response.json();
      if (!cancelled) setContextTitle(data.title ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Mesazhet e vjetra shtohen sipër pa e lëvizur atë që studenti po lexon.
  React.useLayoutEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    if (keepPosition.current !== null) {
      box.scrollTop = box.scrollHeight - keepPosition.current;
      keepPosition.current = null;
      return;
    }
    if (open && view === "chat") endRef.current?.scrollIntoView({ block: "end" });
  }, [turns, pending, open, view]);

  const activeContext = contextDismissed ? null : context;

  function newChat() {
    setTurns([]);
    setThreadId(null);
    setOlderAvailable(false);
    setLockedCount(0);
    setView("chat");
  }

  async function openConversation(id: string) {
    setView("chat");
    setLoadingThread(true);
    setTurns([]);
    try {
      const response = await fetch(`/api/asistenti/biseda/${id}`);
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { id: string; messages: ServerMessage[]; more: boolean };
      setThreadId(data.id);
      setTurns(data.messages.map((message) => ({ ...message })));
      setOlderAvailable(data.more);
      setLockedCount(0);
    } catch {
      toast.error(t("openFailed"));
      setThreadId(null);
    } finally {
      setLoadingThread(false);
    }
  }

  async function loadOlder() {
    const first = turns[0];
    if (!threadId || !first) return;
    setLoadingOlder(true);
    try {
      const response = await fetch(`/api/asistenti/biseda/${threadId}?before=${encodeURIComponent(first.id)}`);
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { messages: ServerMessage[]; more: boolean };
      const box = scrollRef.current;
      keepPosition.current = box ? box.scrollHeight - box.scrollTop : null;
      setTurns((current) => [...data.messages.map((message) => ({ ...message })), ...current]);
      setOlderAvailable(data.more);
    } catch {
      toast.error(t("openFailed"));
    } finally {
      setLoadingOlder(false);
    }
  }

  /**
   * Pyetja, e rrjedhur.
   *
   * Përgjigjja shfaqet shkronjë për shkronjë ndërkohë që vjen. Kur dështon, pyetja
   * mbetet në panel me «Provo përsëri»: serveri e ka hequr nga biseda, prandaj
   * riprovimi nuk e dyfishon dhe nuk numërohet dy herë.
   */
  async function ask(question: string, images: { id: string; preview: string }[], retryOf?: string) {
    if (pending) return false;

    const userId = retryOf ?? `q-${Date.now()}`;
    const answerId = `a-${Date.now()}`;
    const now = new Date().toISOString();

    setTurns((current) =>
      retryOf
        ? current.map((turn) => (turn.id === retryOf ? { ...turn, failed: false } : turn))
        : [
            ...current,
            {
              id: userId,
              role: "user",
              content: question,
              sources: [],
              images: images.map((image) => image.id),
              previews: images.map((image) => image.preview),
              createdAt: now,
            },
          ],
    );
    setPending(true);

    let started = false;
    let failed = false;
    let serverUserId = userId;

    const patch = (update: (turn: Turn) => Turn) =>
      setTurns((current) => current.map((turn) => (turn.id === answerId ? update(turn) : turn)));

    const fail = () => {
      failed = true;
      setTurns((current) =>
        current
          .filter((turn) => !(turn.id === answerId && !turn.content))
          .map((turn) => (turn.id === serverUserId || turn.id === userId ? { ...turn, failed: true } : turn)),
      );
    };

    try {
      const response = await fetch("/api/asistenti", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversationId: threadId,
          question,
          images: images.map((image) => image.id),
          context: activeContext ? { kind: activeContext.kind, id: activeContext.id } : undefined,
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        const key: string = data?.messageKey ?? "";
        if (typeof data?.remaining === "number") setRemaining(data.remaining);
        if (key === "assistant.limitTitle") {
          // Titulli thotë çfarë ndodhi, përshkrimi çfarë mund të bëjë studenti tani.
          toast.error(ta("limitReached"), { description: ta("limitBody") });
          setTurns((current) => current.filter((turn) => turn.id !== userId));
          return false;
        }
        if (key.startsWith("errors.") && key !== "errors.generic") {
          toast.error(errors(key.replace("errors.", "")));
        }
        fail();
        return true;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value: bytes } = await reader.read();
        if (done) break;

        buffer += decoder.decode(bytes, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const raw of lines) {
          const trimmed = raw.trim();
          if (!trimmed.startsWith("data:")) continue;

          let event: { type?: string; [key: string]: unknown };
          try {
            event = JSON.parse(trimmed.slice(5).trim());
          } catch {
            continue;
          }

          if (event.type === "meta") {
            setThreadId((event.conversationId as string) ?? null);
            setLockedCount((event.lockedCount as number) ?? 0);
            setRemaining((event.remaining as number) ?? null);
            // Id-ja e vërtetë e pyetjes, që «shfaq më të vjetrat» të dijë ku të nisë.
            const realId = event.userMessageId as string | undefined;
            if (realId) {
              const localId = serverUserId;
              serverUserId = realId;
              setTurns((current) => current.map((turn) => (turn.id === localId ? { ...turn, id: realId } : turn)));
            }
          } else if (event.type === "delta") {
            const text = (event.text as string) ?? "";
            if (!started) {
              started = true;
              setPending(false);
              setStreamingId(answerId);
              setTurns((current) => [
                ...current,
                {
                  id: answerId,
                  role: "assistant",
                  content: text,
                  sources: [],
                  images: [],
                  createdAt: new Date().toISOString(),
                },
              ]);
            } else {
              patch((turn) => ({ ...turn, content: turn.content + text }));
            }
          } else if (event.type === "replace") {
            patch((turn) => ({ ...turn, content: (event.text as string) ?? turn.content }));
          } else if (event.type === "done") {
            patch((turn) => ({ ...turn, sources: (event.sources as AiSource[]) ?? [] }));
          } else if (event.type === "error") {
            fail();
          }
        }
      }

      if (!started && !failed) fail();
    } catch {
      fail();
    } finally {
      setPending(false);
      setStreamingId(null);
    }
    return true;
  }

  function retry(turn: Turn) {
    void ask(
      turn.content,
      turn.images.map((id, index) => ({ id, preview: turn.previews?.[index] ?? `/api/media/${id}` })),
      turn.id,
    );
  }

  if (!open) {
    const inConversation = /^\/mesazhe\/[^/]+$/.test(pathname);
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("open")}
        className={cn(
          "fixed bottom-20 right-4 z-50 grid place-items-center rounded-full",
          "transition-transform duration-200 ease-out hover:-translate-y-px hover:scale-105 active:scale-95 lg:bottom-[30px] lg:right-9",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
          // Në celular, brenda një bisede, butoni do të mbulonte butonin e dërgimit.
          inConversation && "hidden lg:grid",
        )}
      >
        <AssistantMark size="launcher" />
      </button>
    );
  }

  const suggestions = [t("suggestion1"), t("suggestion2"), t("suggestion3")];

  return (
    <div
      role="dialog"
      aria-label={t("title")}
      className={cn(
        "animate-rise fixed z-50 flex flex-col overflow-hidden border border-border bg-surface-solid shadow-lifted",
        // Mobile: fletë poshtë, rreth 85 për qind lartësi.
        "inset-x-0 bottom-0 h-[85dvh] rounded-t-2xl",
        // Desktop: panel i dokuar poshtë djathtas.
        "lg:left-auto lg:top-auto lg:bottom-6 lg:right-6 lg:rounded-2xl",
        expanded ? "lg:h-[min(780px,calc(100dvh-7rem))] lg:w-[600px]" : "lg:h-[600px] lg:w-[400px]",
      )}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
        <AssistantMark size="sm" />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <p className="truncate text-sm font-semibold text-text">{t("title")}</p>
          {label ? (
            <span
              data-ai-provider
              className="shrink-0 rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold text-brand-600 dark:text-brand-500"
            >
              {label}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-label={expanded ? t("collapse") : t("expand")}
          className="hidden size-7 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text lg:grid"
        >
          {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("minimize")}
          className="grid size-7 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <Minus className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            // Mbyllja e pastron panelin. Biseda mbetet te historiku.
            setOpen(false);
            newChat();
          }}
          aria-label={t("close")}
          className="grid size-7 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <X className="size-3.5" />
        </button>
      </header>

      <nav className="flex shrink-0 items-center gap-1.5 border-b border-border px-3 py-2">
        <Button size="sm" variant={view === "chat" && turns.length === 0 ? "secondary" : "ghost"} onClick={newChat}>
          <Plus />
          {t("newChat")}
        </Button>
        <Button
          size="sm"
          variant={view === "history" ? "secondary" : "ghost"}
          aria-pressed={view === "history"}
          onClick={() => setView((current) => (current === "history" ? "chat" : "history"))}
        >
          <History />
          {t("history")}
        </Button>
        {view === "history" && (threadId || turns.length > 0) ? (
          <button
            type="button"
            onClick={() => setView("chat")}
            className="ml-auto inline-flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text"
          >
            <ArrowLeft className="size-3" aria-hidden />
            {t("backToChat")}
          </button>
        ) : null}
      </nav>

      {view === "history" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin">
          <AssistantHistory
            activeId={threadId}
            onOpen={openConversation}
            onNew={newChat}
            onDeleted={(id) => {
              if (id === threadId) {
                setTurns([]);
                setThreadId(null);
                setOlderAvailable(false);
              }
            }}
          />
        </div>
      ) : (
        <>
          {activeContext && contextTitle ? (
            <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-3 py-2">
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-brand-500/10 px-2.5 py-1 text-xs text-brand-600 dark:text-brand-500">
                <FileText className="size-3 shrink-0" />
                <span className="truncate">
                  {activeContext.kind === "material"
                    ? t("contextMaterial", { title: contextTitle ?? "" })
                    : activeContext.kind === "course"
                      ? t("contextCourse", { name: contextTitle ?? "" })
                      : t("contextJob", { title: contextTitle ?? "" })}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setContextDismissed(true)}
                aria-label={t("removeContext")}
                className="grid size-6 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : null}

          <div
            ref={scrollRef}
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto scrollbar-thin p-3"
            data-ai-thread
          >
            {loadingThread ? (
              <div className="flex flex-col gap-3" aria-busy>
                <div className="ml-auto h-9 w-2/3 shimmer rounded-2xl bg-surface-2" />
                <div className="h-24 w-full shimmer rounded-2xl bg-surface-2" />
                <div className="ml-auto h-9 w-1/2 shimmer rounded-2xl bg-surface-2" />
              </div>
            ) : turns.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
                <AssistantMark size="lg" />
                <p className="measure text-sm text-text-muted">{t("empty")}</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void ask(suggestion, [])}
                      className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text transition-colors duration-150 hover:border-brand-500/50 hover:bg-surface-2"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-text-muted">{ta("ethics")}</p>
              </div>
            ) : (
              <>
                {olderAvailable ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadOlder}
                    loading={loadingOlder}
                    className="self-center"
                  >
                    {t("loadOlder")}
                  </Button>
                ) : null}
                {turns.map((turn) => (
                  <AssistantTurn
                    key={turn.id}
                    turn={turn}
                    streaming={turn.id === streamingId}
                    onRetry={turn.failed ? () => retry(turn) : undefined}
                  />
                ))}
              </>
            )}

            {pending ? (
              <p className="flex items-center gap-2 text-sm text-text-muted" role="status" data-ai-typing>
                {ta("thinking")}
                <span className="flex items-center gap-1" aria-hidden>
                  <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:0ms]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
                </span>
              </p>
            ) : null}

            {lockedCount > 0 && !isPro ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-500/25 bg-brand-500/6 p-2.5">
                <p className="min-w-0 flex-1 text-xs text-text">{ta("proHint", { count: lockedCount })}</p>
                <Button asChild size="sm" variant="pro">
                  <Link href="/une/pro">
                    <Sparkles />
                    {ta("proHintCta")}
                  </Link>
                </Button>
              </div>
            ) : null}

            <div ref={endRef} />
          </div>

          <div className="shrink-0 border-t border-border p-2">
            <AssistantComposer disabled={pending || loadingThread || streamingId !== null} onSend={(question, images) => ask(question, images)} />
            {isMock || remaining !== null ? (
              <p className="mt-1.5 px-1 text-[11px] text-text-muted">
                {isMock ? ta("mock") : ta("remaining", { count: remaining ?? 0 })}
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
