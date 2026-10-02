"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bug, Lightbulb, MessageSquareWarning, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { MediaPicker } from "@/components/feed/media-picker";
import { submitFeedback } from "@/lib/actions/feedback";
import type { MediaRef } from "@/lib/media";
import { cn } from "@/lib/utils";

/*
  Gabimet e fundit të JavaScript-it, të mbajtura në shfletues. Kur testuesi
  shkruan raportin, ato shkojnë bashkë me të, që admini ta shohë çfarë ndodhi
  pa i kërkuar testuesit detaje teknike.
*/
const recentErrors: string[] = [];
let listening = false;

function remember(message: string, path: string) {
  const line = `${path} · ${message}`.replace(/\s+/g, " ").slice(0, 480);
  if (recentErrors.at(-1) === line) return;
  recentErrors.push(line);
  if (recentErrors.length > 10) recentErrors.shift();
}

function listenForErrors() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("error", (event) => remember(event.message || "Error", window.location.pathname));
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason as { message?: string } | string | undefined;
    remember(typeof reason === "string" ? reason : (reason?.message ?? "Unhandled rejection"), window.location.pathname);
  });
}

/** Shfletuesi dhe sistemi me fjalë të thjeshta, pa tërë vargun e user agent-it. */
function describeDevice(): Record<string, string | number | boolean> {
  const agent = navigator.userAgent;
  const browser = /Edg\//.test(agent) ? "Edge" : /OPR\//.test(agent) ? "Opera" : /Chrome\//.test(agent) ? "Chrome" : /Firefox\//.test(agent) ? "Firefox" : /Safari\//.test(agent) ? "Safari" : "Tjetër";
  const system = /Android/.test(agent) ? "Android" : /iPhone|iPad/.test(agent) ? "iOS" : /Windows/.test(agent) ? "Windows" : /Mac OS/.test(agent) ? "macOS" : /Linux/.test(agent) ? "Linux" : "Tjetër";
  return {
    browser,
    system,
    screen: `${window.innerWidth}×${window.innerHeight}`,
    language: document.documentElement.lang || "sq",
    theme: document.documentElement.dataset.theme ?? "blue",
    online: navigator.onLine,
  };
}

type Kind = "bug" | "suggestion";

/**
 * «Raporto»: butoni i vogël mbi butonin e asistentit, në çdo faqe.
 *
 * Testuesi zgjedh problem me platformën ose sugjerim, shkruan çfarë ndodhi, dhe
 * mund të shtojë një screenshot. Faqja, pajisja dhe gabimet e fundit shtohen vetë.
 * Raporti u shkon adminëve si njoftim dhe del te `/admin/testimi`.
 */
export function FeedbackButton() {
  const t = useTranslations("feedback");
  const tAll = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [kind, setKind] = React.useState<Kind>("bug");
  const [message, setMessage] = React.useState("");
  const [media, setMedia] = React.useState<MediaRef[]>([]);
  const [device, setDevice] = React.useState<Record<string, string | number | boolean> | null>(null);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(listenForErrors, []);

  function openDialog() {
    setDevice(describeDevice());
    setErrors([...recentErrors]);
    setOpen(true);
  }

  function send() {
    startTransition(async () => {
      const result = await submitFeedback({
        kind,
        message,
        path: `${window.location.pathname}${window.location.search}`,
        device: device ?? describeDevice(),
        errors,
        media,
      });
      if (!result.ok) {
        toast.error(tAll(result.messageKey ?? "common.retry"));
        return;
      }
      toast.success(t("sent"), { description: t("sentBody") });
      setOpen(false);
      setMessage("");
      setMedia([]);
    });
  }

  // Në celular, brenda një bisede, butoni do të mbulonte fushën e shkrimit.
  const inConversation = /^\/mesazhe\/[^/]+$/.test(pathname);

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-label={t("open")}
        title={t("open")}
        className={cn(
          "fixed bottom-[152px] right-[22px] z-50 grid size-11 place-items-center rounded-full border border-border-strong bg-surface-solid text-text-muted shadow-lifted transition-[color,transform] duration-150 hover:-translate-y-px hover:text-text lg:bottom-[106px] lg:right-[44px]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
          inConversation && "hidden lg:grid",
        )}
        data-feedback-open
      >
        <MessageSquareWarning className="size-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg" data-feedback-dialog>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("body")}</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("kindLabel")}>
              {(["bug", "suggestion"] as const).map((value) => {
                const Icon = value === "bug" ? Bug : Lightbulb;
                const active = kind === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setKind(value)}
                    className={cn(
                      "flex items-start gap-2.5 rounded-control border p-3 text-left transition-colors duration-150",
                      active ? "border-brand-500 bg-brand-50" : "border-border bg-surface-2 hover:border-border-strong",
                    )}
                    data-feedback-kind={value}
                  >
                    <Icon className={cn("mt-0.5 size-[18px] shrink-0", active ? "text-brand-500" : "text-text-muted")} aria-hidden />
                    <span className="flex flex-col">
                      <span className="text-sm font-bold text-text">{t(`kind_${value}`)}</span>
                      <span className="text-xs text-text-muted">{t(`kind_${value}Hint`)}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-text">{t(kind === "bug" ? "messageBug" : "messageSuggestion")}</span>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value.slice(0, 2000))}
                placeholder={t(kind === "bug" ? "placeholderBug" : "placeholderSuggestion")}
                className="min-h-28"
                data-feedback-message
              />
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-muted">{t("screenshot")}</span>
              <MediaPicker media={media} onChange={setMedia} max={1} />
            </div>

            <div className="rounded-control border border-border bg-surface-2 px-3 py-2.5 text-xs text-text-muted" data-feedback-auto>
              <p className="font-semibold text-text">{t("autoTitle")}</p>
              <p className="mt-1">
                {t("autoLine", {
                  path: pathname,
                  browser: String(device?.browser ?? ""),
                  system: String(device?.system ?? ""),
                  screen: String(device?.screen ?? ""),
                })}
              </p>
              <p className="mt-0.5">{t("autoErrors", { count: errors.length })}</p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button onClick={send} loading={pending} disabled={message.trim().length < 8} data-feedback-send>
              <Send />
              {t("send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
