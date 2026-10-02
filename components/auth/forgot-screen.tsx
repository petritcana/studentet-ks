"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { googleResetFormAction, requestPasswordReset } from "@/lib/actions/password-reset";
import { AuthAlert, AuthButton, AuthField, AuthHeading, AuthHint, AuthInput, GoogleAuthButton, OrDivider } from "./auth-ui";

/**
 * «Ke harruar password-in?».
 *
 * Rruga kryesore: «Vazhdo me Google». Studenti konfirmon me llogarinë Google që ka
 * emailin e tij dhe kthehet vetë te «Password i ri». Askush tjetër, as admini,
 * nuk sheh password ose lidhje. Kur platforma ka email të lidhur, poshtë del edhe
 * lidhja me email, që dërgohet vetë.
 */
export function ForgotScreen({
  googleEnabled,
  mailLive,
  minutes,
  error,
}: {
  googleEnabled: boolean;
  mailLive: boolean;
  minutes: number;
  /** Nga kthimi prej Google-it: `pa-llogari` kur ai email s'ka llogari këtu. */
  error: string | null;
}) {
  const t = useTranslations("authFlow");
  const googleRef = React.useRef<HTMLFormElement>(null);
  const [connecting, setConnecting] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [invalid, setInvalid] = React.useState(false);
  const [limited, setLimited] = React.useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = email.trim();
    const looksValid = value.includes("@") ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) : value.length >= 3;
    if (!looksValid) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setSending(true);
    void requestPasswordReset(value).then((result) => {
      setSending(false);
      if (!result.ok && result.messageKey === "errors.rateLimited") {
        setLimited(true);
        return;
      }
      setSent(true);
    });
  }

  return (
    <div data-auth-screen="forgot">
      <Link href="/hyr" className="mb-[22px] inline-flex items-center gap-1.5 text-sm font-bold text-brand-500 hover:underline">
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToLogin")}
      </Link>
      <AuthHeading title={t("forgotTitle")} lead={t("forgotGoogleLead")} />

      {error === "pa-llogari" ? (
        <AuthAlert tone="error" title={t("resetNoAccountTitle")}>
          {t("resetNoAccountBody")}
        </AuthAlert>
      ) : null}
      {error === "google-jo" ? <AuthAlert tone="error" title={t("resetGoogleOff")} /> : null}

      {/* Google e konfirmon që je ti; pastaj kthehesh vetë te password-i i ri. */}
      <form ref={googleRef} action={googleResetFormAction} hidden />
      <GoogleAuthButton
        recommended
        loading={connecting}
        onClick={() => {
          if (!googleEnabled) return;
          setConnecting(true);
          googleRef.current?.requestSubmit();
        }}
      />
      <AuthHint icon={<ShieldCheck className="size-[18px]" aria-hidden />} className="mt-3">
        {googleEnabled ? t("forgotGoogleHint") : t("resetGoogleOff")}
      </AuthHint>

      {mailLive ? (
        <>
          <OrDivider label={t("or")} />
          {sent ? (
            <AuthAlert tone="success" title={t("sentTitle")}>
              {t("sentBody", { minutes })}
            </AuthAlert>
          ) : null}
          {limited ? (
            <AuthAlert tone="error" title={t("resetLimitedTitle")}>
              {t("resetLimitedBody")}
            </AuthAlert>
          ) : null}
          <form onSubmit={submit} noValidate>
            <AuthField
              label={t("forgotIdentifier")}
              htmlFor="forgot-email"
              help={invalid ? t("forgotInvalid") : undefined}
              helpTone="error"
              helpId="forgot-email-error"
            >
              <AuthInput
                id="forgot-email"
                name="email"
                type="text"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("forgotPlaceholder")}
                icon={<Mail aria-hidden />}
                tone={invalid ? "error" : undefined}
                aria-describedby={invalid ? "forgot-email-error" : undefined}
              />
            </AuthField>
            <AuthButton type="submit" tone="outline" loading={sending} loadingLabel={t("sending")} data-forgot-submit>
              {t("sendLink")}
            </AuthButton>
          </form>
        </>
      ) : null}
    </div>
  );
}
