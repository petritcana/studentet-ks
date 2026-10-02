"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, Check, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  Pjesët e përbashkëta të hyrjes dhe regjistrimit.

  Fushat janë 52px, butonat 56px, qoshet 14px dhe kartat 16px, me fokusin blu
  me unazë 4px. Ngjyrat vijnë nga tokenat e temës (`--field`, `--field-line`,
  `--google-bg`), që faqet të jenë të plota edhe në dritë.
*/

/** Shenja zyrtare me katër ngjyra e Google-it. Ngjyrat janë të markës së tyre, jo tonat. */
export function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-[22px] shrink-0", className)} aria-hidden focusable="false">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z" />
    </svg>
  );
}

/** Rrotulluesi i vogël brenda butonit. Vetëm te butonat që presin, kurrë në vend të përmbajtjes. */
export function ButtonSpinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-5 shrink-0 animate-spin rounded-full border-[2.5px] border-current border-t-transparent opacity-80 motion-reduce:[animation-duration:2s]",
        className,
      )}
    />
  );
}

export function AuthHeading({ title, lead }: { title: string; lead: string }) {
  return (
    <div className="mb-7">
      <h1 className="font-serif text-[38px] font-normal leading-[1.05] tracking-[-0.01em] text-text min-[560px]:text-[44px]">
        {title}
      </h1>
      <p className="mt-2.5 text-[15.5px] text-text-muted">{lead}</p>
    </div>
  );
}

/** Butoni kryesor 56px: gradienti blu, ose i bardhë me «G» për Google. */
export const AuthButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: "primary" | "google" | "outline";
    loading?: boolean;
    loadingLabel?: string;
  }
>(function AuthButton({ tone = "primary", loading = false, loadingLabel, className, children, disabled, ...props }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "flex h-14 w-full items-center justify-center gap-3 rounded-control text-base font-bold transition-[transform,box-shadow,background-color] duration-150 active:translate-y-px",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        "disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none",
        tone === "primary" && "bg-primary bg-primary-grad text-on-primary shadow-cta enabled:hover:brightness-110",
        tone === "google" && "border border-field-line bg-google-bg text-google-ink shadow-soft enabled:hover:shadow-[0_0_0_3px_var(--primary-soft)]",
        tone === "outline" && "border border-field-line-strong bg-transparent text-text enabled:hover:bg-field",
        // Butoni që pret nuk zbehet: studenti duhet ta lexojë që po ndodh diçka.
        loading && "disabled:opacity-100",
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <ButtonSpinner />
          <span>{loadingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});

/** «Vazhdo me Google», i bardhë, me etiketën «REKOMANDOHET» kur është zgjedhja e parë. */
export function GoogleAuthButton({
  onClick,
  loading,
  recommended = false,
  type = "button",
}: {
  onClick?: () => void;
  loading: boolean;
  recommended?: boolean;
  type?: "button" | "submit";
}) {
  const t = useTranslations("authFlow");
  return (
    <div className="relative">
      <AuthButton type={type} tone="google" onClick={onClick} loading={loading} loadingLabel={t("googleConnecting")} data-google-button>
        <GoogleG />
        <span>{t("google")}</span>
      </AuthButton>
      {recommended ? (
        <span className="pointer-events-none absolute -top-2.5 right-3 rounded-full border border-brand-500/45 bg-surface-solid px-2.5 py-0.5 text-[10.5px] font-bold tracking-[0.04em] text-brand-600">
          {t("recommended")}
        </span>
      ) : null}
    </div>
  );
}

export function OrDivider({ label }: { label: string }) {
  return (
    <div className="my-[22px] flex items-center gap-3.5 text-[13px] font-semibold text-text-dim" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-field-line" />
      {label}
      <span className="h-px flex-1 bg-field-line" />
    </div>
  );
}

/** Kuti ndihme me ikonë në katror të butë. */
export function AuthHint({ icon, children, className }: { icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-control border border-field-line bg-field/60 px-4 py-3.5 text-[13.5px] text-text-muted [&_b]:text-text",
        className,
      )}
    >
      <span className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-brand-50 text-brand-600 [&_svg]:size-[18px]">
        {icon}
      </span>
      <div>{children}</div>
    </div>
  );
}

export function AuthAlert({
  tone,
  title,
  children,
  id,
}: {
  tone: "error" | "success" | "info";
  title: string;
  children?: React.ReactNode;
  id?: string;
}) {
  const Icon = tone === "success" ? Check : AlertCircle;
  return (
    <div
      id={id}
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "mb-5 flex items-start gap-3 rounded-control border px-3.5 py-3 text-[13.5px]",
        tone === "error" && "border-danger/40 bg-danger-50 text-danger-text",
        tone === "success" && "border-success/40 bg-success-50 text-success-text",
        tone === "info" && "border-brand-500/45 bg-brand-50 text-brand-600",
      )}
      data-auth-alert={tone}
    >
      <Icon className="mt-0.5 size-[18px] shrink-0" aria-hidden />
      <div>
        <b className="block text-text">{title}</b>
        {children}
      </div>
    </div>
  );
}

export function AuthField({
  label,
  htmlFor,
  aside,
  help,
  helpTone = "muted",
  helpId,
  children,
}: {
  label: string;
  htmlFor?: string;
  /** Djathtas etiketës: lidhja «Ke harruar password-in?» ose statusi i username-it. */
  aside?: React.ReactNode;
  help?: React.ReactNode;
  helpTone?: "muted" | "ok" | "error";
  helpId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-[18px]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[14.5px] font-bold text-text">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {help ? (
        <p
          id={helpId}
          className={cn(
            "mt-[7px] flex items-center gap-1.5 text-[12.5px] [&_svg]:size-3.5",
            helpTone === "muted" && "text-text-dim",
            helpTone === "ok" && "text-success-text",
            helpTone === "error" && "text-danger-text",
          )}
        >
          {help}
        </p>
      ) : null}
    </div>
  );
}

/** Fusha 52px: ikonë majtas, tekst, dhe diçka djathtas (syri, dryni). */
export const AuthInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    icon: React.ReactNode;
    trailing?: React.ReactNode;
    tone?: "ok" | "error";
  }
>(function AuthInput({ icon, trailing, tone, readOnly, className, ...props }, ref) {
  return (
    <div
      className={cn(
        "flex h-[52px] items-center gap-2.5 rounded-control border px-3.5 text-text-muted transition-[border-color,box-shadow,background-color] duration-150 [&>svg]:size-[18px] [&>svg]:shrink-0",
        readOnly
          ? "border-dashed border-field-line bg-field/45"
          : "border-field-line bg-field hover:bg-field-hover focus-within:border-brand-500 focus-within:shadow-[0_0_0_4px_var(--primary-soft)]",
        tone === "ok" && "border-success/55",
        tone === "error" && "border-danger shadow-[0_0_0_4px_var(--danger-50)]",
      )}
      data-tone={tone}
    >
      {icon}
      <input
        ref={ref}
        readOnly={readOnly}
        aria-invalid={tone === "error" || undefined}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-[15px] font-medium text-text outline-none placeholder:text-text-dim",
          readOnly && "font-semibold",
          className,
        )}
        {...props}
      />
      {trailing}
    </div>
  );
});

/** Password me syrin që e shfaq dhe e fsheh. */
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { icon: React.ReactNode; tone?: "ok" | "error" }
>(function PasswordInput(props, ref) {
  const t = useTranslations("authFlow");
  const [shown, setShown] = React.useState(false);
  return (
    <AuthInput
      ref={ref}
      type={shown ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setShown((value) => !value)}
          aria-label={t(shown ? "hidePassword" : "showPassword")}
          aria-pressed={shown}
          className="grid size-[34px] shrink-0 place-items-center rounded-[10px] text-text-muted transition-colors hover:bg-surface-2 hover:text-text [&_svg]:size-[18px]"
          data-eye
        >
          {shown ? <EyeOff /> : <Eye />}
        </button>
      }
      {...props}
    />
  );
});

/** Lidhja e vogël e shkronjave: «Ke harruar password-in?», «Hyr këtu». */
export function AuthLink({ className, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={cn("font-bold text-brand-500 hover:underline", className)} {...props} />;
}

export type StepState = "done" | "current" | "todo";

/** Hapat lart: Google, Llogaria, Institucioni, Fakulteti, +5. Nën 560px vetëm numrat. */
export function AuthStepper({ steps, more }: { steps: { label: string; state: StepState }[]; more?: string }) {
  return (
    <ol className="mb-[30px] flex items-center gap-1.5" data-auth-stepper>
      {steps.map((step, index) => (
        <React.Fragment key={step.label}>
          <li
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap text-xs font-bold",
              step.state === "todo" ? "text-text-dim" : "text-text",
            )}
            aria-current={step.state === "current" ? "step" : undefined}
          >
            <span
              className={cn(
                "grid size-[22px] place-items-center rounded-full border-[1.5px] text-[11px]",
                step.state === "done" && "border-success bg-success text-bg",
                step.state === "current" && "border-transparent bg-primary bg-primary-grad text-on-primary",
                step.state === "todo" && "border-field-line-strong",
              )}
            >
              {step.state === "done" ? <Check className="size-3 stroke-[3]" aria-hidden /> : index + 1}
            </span>
            <span className="max-[559px]:sr-only">{step.label}</span>
          </li>
          {index < steps.length - 1 || more ? <li aria-hidden className="h-0.5 min-w-2.5 flex-1 bg-field-line" /> : null}
        </React.Fragment>
      ))}
      {more ? <li className="text-xs text-text-dim">{more}</li> : null}
    </ol>
  );
}
