"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowRight,
  AtSign,
  CalendarDays,
  Camera,
  Check,
  GraduationCap,
  ImageIcon,
  MailCheck,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { confirmStudentEmail, resendStudentCode, sendStudentCode, submitIdDocument } from "@/lib/actions/registration";
import { birthDateBounds, checkBirthDate } from "@/lib/age";
import { shrinkImage } from "@/lib/shrink-image";
import { INSTITUTION_NAMES, studentDomainFor, upcomingInstitutionFor } from "@/lib/student-domains";
import { uploadFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { AuthAlert, AuthButton, AuthField, AuthHeading, AuthHint, AuthInput, AuthStepper, type StepState } from "./auth-ui";

export type SignupStep = { label: string; state: StepState };

/**
 * Emaili studentor, kur nuk erdhi nga regjistrimi: hyrja me Google me adresë jo
 * studentore, ose studenti që e shkroi gabim adresën. Te Google pyetet edhe data
 * e lindjes, nëse ende mungon.
 */
export function StudentEmailStep({
  steps,
  loginEmail,
  needsBirth,
  fromGoogle,
  onCancel,
}: {
  steps: SignupStep[];
  loginEmail: string;
  needsBirth: boolean;
  fromGoogle: boolean;
  onCancel?: () => void;
}) {
  const t = useTranslations("signup");
  const tf = useTranslations("authFlow");
  const ta = useTranslations("auth");
  const tAll = useTranslations();
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [birthDate, setBirthDate] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const bounds = React.useMemo(() => birthDateBounds(), []);

  const birth = birthDate ? checkBirthDate(birthDate) : null;
  const complete = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const domain = complete ? studentDomainFor(email) : null;
  const upcoming = complete && !domain ? upcomingInstitutionFor(email) : null;
  const ready = Boolean(domain) && (!needsBirth || Boolean(birth?.ok));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setError(null);
    startTransition(async () => {
      const result = await sendStudentCode(email, needsBirth ? birthDate : undefined);
      if (!result.ok) {
        setError(tAll(result.messageKey ?? "common.retry", result.values));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div data-auth-screen="student-email">
      {steps.length > 0 ? <AuthStepper steps={steps} /> : null}
      <AuthHeading
        title={t("emailTitle")}
        lead={fromGoogle ? t("emailLeadGoogle", { email: loginEmail }) : t("emailLeadChange")}
      />

      {error ? <AuthAlert tone="error" title={error} /> : null}

      <form onSubmit={submit} noValidate>
        {needsBirth ? (
          <AuthField
            label={tf("birthDate")}
            htmlFor="signup-birth"
            help={
              birth && !birth.ok ? (
                <>
                  <AlertCircle aria-hidden />
                  {ta(birth.reason)}
                </>
              ) : (
                tf("birthHelp")
              )
            }
            helpTone={birth && !birth.ok ? "error" : "muted"}
          >
            <AuthInput
              id="signup-birth"
              type="date"
              value={birthDate}
              min={bounds.min}
              max={bounds.max}
              onChange={(event) => setBirthDate(event.target.value)}
              icon={<CalendarDays aria-hidden />}
              tone={birth ? (birth.ok ? "ok" : "error") : undefined}
              data-birth-date
            />
          </AuthField>
        ) : null}

        <AuthField
          label={tf("studentEmail")}
          htmlFor="signup-email"
          help={
            domain ? (
              <>
                <Check aria-hidden />
                {INSTITUTION_NAMES[domain.institution] ?? domain.domain}
              </>
            ) : upcoming ? (
              <>
                <AlertCircle aria-hidden />
                {ta("errorEmailUpcoming", { institution: upcoming.name })}
              </>
            ) : complete ? (
              <>
                <AlertCircle aria-hidden />
                {ta("errorEmailNotStudent")}
              </>
            ) : (
              tf("studentEmailHelp")
            )
          }
          helpTone={complete ? (domain ? "ok" : "error") : "muted"}
        >
          <AuthInput
            id="signup-email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="emri.mbiemri@student.uni-pr.edu"
            icon={domain ? <GraduationCap aria-hidden /> : <AtSign aria-hidden />}
            tone={complete ? (domain ? "ok" : "error") : undefined}
            data-student-email={domain ? domain.institution : complete ? "unknown" : undefined}
          />
        </AuthField>

        <AuthButton type="submit" disabled={!ready} loading={pending} loadingLabel={t("sending")} data-send-code>
          {t("sendCode")}
          <ArrowRight className="size-[18px]" aria-hidden />
        </AuthButton>
        {onCancel ? (
          <button type="button" onClick={onCancel} className="mt-4 text-sm font-bold text-brand-500 hover:underline">
            {t("backToCode")}
          </button>
        ) : null}
      </form>
    </div>
  );
}

/**
 * «Shkruaj kodin»: gjashtë shifra nga emaili studentor. Kodi i plotë dërgohet
 * vetë; «Dërgoje prapë» pret 45 sekonda, «Ndrysho emailin» kthen te adresa.
 */
export function CodeStep({
  steps,
  email,
  devCode,
  resendIn,
}: {
  steps: SignupStep[];
  email: string;
  /** Vetëm lokalisht, pa ofrues emaili: kodi shfaqet që rrjedha të provohet. */
  devCode: string | null;
  /** Sekonda deri sa lejohet ridërgimi, të llogaritura në server. */
  resendIn: number;
}) {
  const t = useTranslations("signup");
  const tAll = useTranslations();
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [shownCode, setShownCode] = React.useState(devCode);
  const [wait, setWait] = React.useState(resendIn);
  const [changing, setChanging] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  function confirm(value: string) {
    if (!/^\d{6}$/.test(value)) return;
    setError(null);
    startTransition(async () => {
      const result = await confirmStudentEmail(value);
      if (!result.ok) {
        setError(tAll(result.messageKey ?? "common.retry"));
        setCode("");
        inputRef.current?.focus();
        return;
      }
      router.refresh();
    });
  }

  function resend() {
    setError(null);
    startTransition(async () => {
      const result = await resendStudentCode();
      if (!result.ok) {
        setError(tAll(result.messageKey ?? "common.retry"));
        return;
      }
      setNotice(t("codeResent", { email }));
      setShownCode(result.devCode ?? null);
      setWait(45);
    });
  }

  if (changing) {
    return (
      <StudentEmailStep
        steps={steps}
        loginEmail={email}
        needsBirth={false}
        fromGoogle={false}
        onCancel={() => setChanging(false)}
      />
    );
  }

  return (
    <div data-auth-screen="code">
      {steps.length > 0 ? <AuthStepper steps={steps} /> : null}
      <span className="mb-5 grid size-14 place-items-center rounded-[18px] bg-brand-50 text-brand-600">
        <MailCheck className="size-7" aria-hidden />
      </span>
      <AuthHeading title={t("codeTitle")} lead={t("codeLead", { email })} />

      {error ? <AuthAlert tone="error" title={error} /> : null}
      {notice && !error ? <AuthAlert tone="success" title={notice} /> : null}
      {shownCode ? (
        <AuthAlert tone="info" title={t("devCodeTitle")}>
          <span data-dev-code={shownCode}>{t("devCodeBody", { code: shownCode })}</span>
        </AuthAlert>
      ) : null}

      <AuthField label={t("codeLabel")} htmlFor="signup-code">
        <input
          ref={inputRef}
          id="signup-code"
          value={code}
          onChange={(event) => {
            const value = event.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(value);
            if (value.length === 6) confirm(value);
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          placeholder="000000"
          aria-describedby="signup-code-help"
          className={cn(
            "tabular h-16 w-full rounded-control border border-field-line bg-field text-center font-display text-[30px] font-bold tracking-[0.5em] text-text outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-text-dim/50",
            "focus:border-brand-500 focus:shadow-[0_0_0_4px_var(--primary-soft)]",
            error && "border-danger",
          )}
          data-code-input
        />
        <p id="signup-code-help" className="mt-2 text-[12.5px] text-text-dim">
          {t("codeHelp")}
        </p>
      </AuthField>

      <AuthButton type="button" disabled={code.length !== 6} loading={pending} loadingLabel={t("checking")} onClick={() => confirm(code)} data-code-submit>
        {t("confirm")}
        <ArrowRight className="size-[18px]" aria-hidden />
      </AuthButton>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <button
          type="button"
          onClick={resend}
          disabled={wait > 0 || pending}
          className="inline-flex items-center gap-1.5 font-bold text-brand-500 hover:underline disabled:cursor-not-allowed disabled:text-text-dim disabled:no-underline"
          data-code-resend
        >
          <RotateCcw className="size-4" aria-hidden />
          {wait > 0 ? t("resendIn", { seconds: wait }) : t("resend")}
        </button>
        <button type="button" onClick={() => setChanging(true)} className="font-bold text-brand-500 hover:underline" data-change-email>
          {t("changeEmail")}
        </button>
      </div>

      <AuthHint icon={<ShieldCheck />} className="mt-6">
        {t("codeSpam")}
      </AuthHint>
    </div>
  );
}

/**
 * Fotoja e ID-së studentore. Kamera e telefonit ose galeria; fotoja zvogëlohet
 * në shfletues, ngarkohet private dhe e sheh vetëm ekipi që verifikon. Pas
 * vendimit fshihet.
 */
export function IdStep({ steps, rejectedReason }: { steps: SignupStep[]; rejectedReason: string | null }) {
  const t = useTranslations("signup");
  const tAll = useTranslations();
  const router = useRouter();
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const galleryRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [mediaId, setMediaId] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setMediaId(null);
    if (!file.type.startsWith("image/")) {
      setError(t("idNotImage"));
      return;
    }
    const small = await shrinkImage(file).catch(() => file);
    setPreview(URL.createObjectURL(small));
    setProgress(0);
    const result = await uploadFile(small, { surface: "id", onProgress: setProgress });
    setProgress(null);
    if (!result.ok) {
      setError(tAll(result.errorKey));
      return;
    }
    setMediaId(result.media.id);
  }

  function submit() {
    if (!mediaId) return;
    startTransition(async () => {
      const result = await submitIdDocument(mediaId);
      if (!result.ok) {
        setError(tAll(result.messageKey ?? "common.retry"));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div data-auth-screen="id">
      {steps.length > 0 ? <AuthStepper steps={steps} /> : null}
      <AuthHeading title={t("idTitle")} lead={t("idLead")} />

      {rejectedReason !== null ? (
        <AuthAlert tone="error" title={t("idRejectedTitle")}>
          {rejectedReason ? t("idRejectedReason", { reason: rejectedReason }) : t("idRejectedBody")}
        </AuthAlert>
      ) : null}
      {error ? <AuthAlert tone="error" title={error} /> : null}

      <div
        className={cn(
          "relative mb-5 grid aspect-[1.586] w-full place-items-center overflow-hidden rounded-[18px] border-2 border-dashed",
          preview ? "border-success/55 bg-field" : "border-field-line-strong bg-field/60",
        )}
        data-id-preview={mediaId ? "ready" : preview ? "uploading" : "empty"}
      >
        {preview ? (
          // Parapamja është skedar lokal (blob:), jo adresë e jona: `MediaImage` nuk duhet.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={t("idPreviewAlt")} className="size-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 text-center text-text-muted">
            <GraduationCap className="size-10 text-brand-500" aria-hidden />
            <p className="text-sm font-semibold text-text">{t("idFrame")}</p>
            <p className="text-xs">{t("idFrameHint")}</p>
          </div>
        )}
        {progress !== null ? (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-field-line" aria-hidden>
            <div className="h-full bg-brand-500 transition-[width] duration-200" style={{ width: `${progress}%` }} />
          </div>
        ) : null}
        {mediaId ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-xs font-bold text-bg">
            <Check className="size-3.5 stroke-[3]" aria-hidden />
            {t("idUploaded")}
          </span>
        ) : null}
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          void pick(event.target.files?.[0]);
          event.target.value = "";
        }}
        data-id-camera
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          void pick(event.target.files?.[0]);
          event.target.value = "";
        }}
        data-id-file
      />

      <div className="mb-5 grid grid-cols-2 gap-2.5">
        <AuthButton type="button" tone="outline" onClick={() => cameraRef.current?.click()} className="h-12 text-sm" data-id-take>
          <Camera className="size-[18px]" aria-hidden />
          {t("idCamera")}
        </AuthButton>
        <AuthButton type="button" tone="outline" onClick={() => galleryRef.current?.click()} className="h-12 text-sm" data-id-pick>
          <ImageIcon className="size-[18px]" aria-hidden />
          {t("idGallery")}
        </AuthButton>
      </div>

      <ul className="mb-6 flex flex-col gap-2 text-[13px] text-text-muted">
        {(["idTip1", "idTip2", "idTip3"] as const).map((key) => (
          <li key={key} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-success-text" aria-hidden />
            {t(key)}
          </li>
        ))}
      </ul>

      <AuthButton type="button" disabled={!mediaId} loading={pending} loadingLabel={t("sending")} onClick={submit} data-id-submit>
        {t("idSubmit")}
        <ArrowRight className="size-[18px]" aria-hidden />
      </AuthButton>

      <AuthHint icon={<ShieldCheck />} className="mt-6">
        {t("idPrivacy")}
      </AuthHint>
    </div>
  );
}
