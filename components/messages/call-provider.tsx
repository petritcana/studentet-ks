"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Phone, PhoneOff, Video } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { declineCall, joinCall, startCall } from "@/lib/actions/calls";
import { CallView } from "./call-view";

type Me = { id: string; name: string; avatar: string | null };
type Incoming = {
  id: string;
  video: boolean;
  conversationId: string;
  group: string | null;
  caller: { name: string; avatar: string | null };
};
type Active = { id: string; video: boolean; title: string; conversationId: string };

type CallContext = {
  active: Active | null;
  /** Nis një thirrje nga biseda. Kthen gabimin si çelës, ose null. */
  start: (conversationId: string, video: boolean, title: string) => Promise<string | null>;
  join: (callId: string, video: boolean, title: string, conversationId: string) => Promise<string | null>;
};

const Context = React.createContext<CallContext | null>(null);

export function useCalls() {
  const value = React.useContext(Context);
  if (!value) throw new Error("useCalls duhet brenda CallProvider");
  return value;
}

const RING_POLL_MS = 3000;

/**
 * Thirrjet jetojnë mbi gjithë platformën, jo te një faqe.
 *
 * Kur dikush të thërret, dritarja e ziles del kudo që je, me «Prano» në të
 * gjelbër dhe «Refuzo» në të kuq. Pranimi hap ekranin e thirrjes mbi faqen, dhe
 * thirrja nuk mbyllet kur kalon nga një faqe te tjetra.
 */
export function CallProvider({ me, children }: { me: Me; children: React.ReactNode }) {
  const t = useTranslations("calls");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [active, setActive] = React.useState<Active | null>(null);
  const [incoming, setIncoming] = React.useState<Incoming | null>(null);
  const [answering, setAnswering] = React.useState(false);
  const dismissed = React.useRef(new Set<string>());

  // Zilja: pyet rrallë, vetëm kur skeda shihet dhe kur s'je vetë në thirrje.
  React.useEffect(() => {
    if (active) {
      setIncoming(null);
      return;
    }
    let stopped = false;
    async function poll() {
      if (document.visibilityState !== "visible") return;
      const response = await fetch("/api/thirrje/hyrese", { cache: "no-store" }).catch(() => null);
      if (stopped || !response?.ok) return;
      const data = (await response.json()) as { calls: Incoming[] };
      const next = data.calls.find((call) => !dismissed.current.has(call.id)) ?? null;
      setIncoming((current) => (current?.id === next?.id ? current : next));
    }
    void poll();
    const timer = window.setInterval(poll, RING_POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [active]);

  const start = React.useCallback(async (conversationId: string, video: boolean, title: string) => {
    const result = await startCall(conversationId, video);
    if (!result.ok || !result.callId) return result.messageKey ?? "common.retry";
    setActive({ id: result.callId, video, title, conversationId });
    return null;
  }, []);

  const join = React.useCallback(async (callId: string, video: boolean, title: string, conversationId: string) => {
    const result = await joinCall(callId);
    if (!result.ok) return result.messageKey ?? "common.retry";
    dismissed.current.add(callId);
    setIncoming(null);
    setActive({ id: callId, video, title, conversationId });
    return null;
  }, []);

  async function accept(call: Incoming) {
    setAnswering(true);
    const title = call.group ?? call.caller.name;
    const error = await join(call.id, call.video, title, call.conversationId);
    setAnswering(false);
    if (error) {
      toast.error(error.startsWith("errors.") ? errors(error.replace("errors.", "")) : t("endedToast"));
      dismissed.current.add(call.id);
      setIncoming(null);
    }
  }

  async function decline(call: Incoming) {
    dismissed.current.add(call.id);
    setIncoming(null);
    await declineCall(call.id);
  }

  const value = React.useMemo(() => ({ active, start, join }), [active, start, join]);

  return (
    <Context.Provider value={value}>
      {children}
      {incoming && !active ? (
        <IncomingCall call={incoming} answering={answering} onAccept={() => void accept(incoming)} onDecline={() => void decline(incoming)} />
      ) : null}
      {active ? (
        <CallView
          callId={active.id}
          me={me}
          title={active.title}
          initialVideo={active.video}
          onClose={() => {
            setActive(null);
            router.refresh();
          }}
        />
      ) : null}
    </Context.Provider>
  );
}

/** Dritarja e ziles: kush po të thërret, zë apo video, dhe dy butona të qartë. */
function IncomingCall({
  call,
  answering,
  onAccept,
  onDecline,
}: {
  call: Incoming;
  answering: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const t = useTranslations("calls");
  useRingtone();

  return (
    <div
      className="fixed inset-x-3 top-3 z-[80] mx-auto max-w-sm animate-rise rounded-card border border-border-strong bg-surface-solid p-4 shadow-lifted sm:top-5"
      role="alertdialog"
      aria-live="assertive"
      aria-label={t("incomingLabel", { name: call.caller.name })}
      data-incoming-call
    >
      <div className="flex items-center gap-3">
        <span className="relative shrink-0">
          <span className="absolute inset-0 animate-ping rounded-full bg-success/40 motion-reduce:hidden" aria-hidden />
          <Avatar name={call.caller.name} src={call.caller.avatar} size="lg" className="relative" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-display text-base font-bold text-text">{call.caller.name}</span>
          <span className="flex items-center gap-1.5 text-sm text-text-muted">
            {call.video ? <Video className="size-4" aria-hidden /> : <Phone className="size-4" aria-hidden />}
            {call.group
              ? t("incomingGroup", { group: call.group })
              : call.video
                ? t("incomingVideo")
                : t("incomingAudio")}
          </span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onDecline}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-danger-solid font-semibold text-white transition-transform duration-150 hover:brightness-110 active:scale-95"
          data-call-decline
        >
          <PhoneOff className="size-5" aria-hidden />
          {t("decline")}
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={answering}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-success font-semibold text-white transition-transform duration-150 hover:brightness-110 active:scale-95 disabled:opacity-60"
          data-call-accept
        >
          {call.video ? <Video className="size-5" aria-hidden /> : <Phone className="size-5" aria-hidden />}
          {t("accept")}
        </button>
      </div>
    </div>
  );
}

/**
 * Zilja: dy tinguj të shkurtër çdo dy sekonda, dhe dridhje në telefon. Kur
 * shfletuesi s'e lejon zërin pa prekje, dritarja mbetet e dukshme vetë.
 */
function useRingtone() {
  React.useEffect(() => {
    let context: AudioContext | null = null;
    try {
      context = new AudioContext();
    } catch {
      context = null;
    }
    function ring() {
      navigator.vibrate?.([350, 200, 350]);
      if (!context) return;
      void context.resume().catch(() => undefined);
      const now = context.currentTime;
      for (const offset of [0, 0.4]) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = offset === 0 ? 880 : 660;
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.32);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now + offset);
        oscillator.stop(now + offset + 0.34);
      }
    }
    ring();
    const timer = window.setInterval(ring, 2000);
    return () => {
      window.clearInterval(timer);
      navigator.vibrate?.(0);
      void context?.close().catch(() => undefined);
    };
  }, []);
}
