"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { KeyRound, User } from "lucide-react";
import { googleSignInAction, loginAction } from "@/lib/actions/auth";
import { IDLE } from "@/lib/actions/types";
import { DEMO_GOOGLE_DELAY_MS } from "@/lib/auth-demo";
import { AuthAlert, AuthButton, AuthField, AuthHeading, AuthInput, GoogleAuthButton, OrDivider, PasswordInput } from "./auth-ui";

/**
 * Hyrja: username ose email studentor, dhe password-i.
 *
 * Veprimi është i njëjti `loginAction` si më parë, me të njëjtat emra fushash,
 * prandaj hyrja punon njësoj. Gabimi i të dhënave del si alarm i kuq lart dhe
 * si kufi i kuq te password-i; gabimet e tjera (p.sh. shumë prova) dalin si alarm.
 */
export function LoginScreen({
  googleEnabled,
  demoEnabled,
  oauthError = null,
}: {
  googleEnabled: boolean;
  demoEnabled: boolean;
  /** Google refuzoi (email i pakonfirmuar) ose lidhja me Google dështoi. */
  oauthError?: "denied" | "failed" | null;
}) {
  const t = useTranslations("authFlow");
  const tAuth = useTranslations("auth");
  const tAll = useTranslations();
  const router = useRouter();
  const [state, action, pending] = React.useActionState(loginAction, IDLE);
  const [connecting, setConnecting] = React.useState(false);
  // React e pastron formularin pas veprimit: username-i mbahet këtu, që pas një
  // gabimi studenti të mos e shkruajë prapë. Password-i pastrohet, siç duhet.
  const [identifier, setIdentifier] = React.useState("");
  const googleRef = React.useRef<HTMLFormElement>(null);

  const credentials = !state.ok && state.messageKey === "auth.errorCredentials";
  const googleOnly = !state.ok && state.messageKey === "authFlow.googleOnly";
  const otherError = !state.ok && state.messageKey && !credentials && !googleOnly ? state.messageKey : null;

  function google() {
    setConnecting(true);
    if (googleEnabled) {
      googleRef.current?.requestSubmit();
      return;
    }
    window.setTimeout(() => router.push("/regjistrohu/llogaria"), DEMO_GOOGLE_DELAY_MS);
  }

  return (
    <div data-auth-screen="login">
      <AuthHeading title={t("loginTitle")} lead={t("loginLead")} />

      {oauthError && !state.messageKey ? (
        <AuthAlert tone="error" title={t(oauthError === "denied" ? "googleDeniedTitle" : "googleFailedTitle")} id="login-error">
          {t(oauthError === "denied" ? "googleDeniedBody" : "googleFailedBody")}
        </AuthAlert>
      ) : null}
      {credentials ? (
        <AuthAlert tone="error" title={t("loginErrorTitle")} id="login-error">
          {t("loginErrorBody")}
        </AuthAlert>
      ) : null}
      {googleOnly ? (
        <AuthAlert tone="info" title={t("googleOnlyTitle")} id="login-error">
          {t("googleOnlyBody")}
        </AuthAlert>
      ) : null}
            {otherError ? <AuthAlert tone="error" title={tAll(otherError, state.values)} id="login-error" /> : null}

      <form action={action}>
        {/* Pranohet email ose emër përdoruesi: studenti e mban mend më lehtë emrin. */}
        <AuthField label={t("identifier")} htmlFor="email">
          <AuthInput
            id="email"
            name="email"
            type="text"
            inputMode="email"
            autoComplete="username"
            required
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            icon={<User aria-hidden />}
            placeholder={t("identifierPlaceholder")}
          />
        </AuthField>

        <AuthField
          label={t("password")}
          htmlFor="password"
          aside={
            <Link href="/harrova-password" className="text-[13px] font-bold text-brand-500 hover:underline">
              {t("forgot")}
            </Link>
          }
        >
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            icon={<KeyRound aria-hidden />}
            placeholder={t("passwordPlaceholder")}
            tone={credentials ? "error" : undefined}
            aria-describedby={credentials || googleOnly || otherError ? "login-error" : undefined}
          />
        </AuthField>

        <AuthButton type="submit" loading={pending} loadingLabel={t("loggingIn")} data-login-submit>
          {t("login")}
        </AuthButton>
      </form>

      <OrDivider label={t("or")} />
      <form ref={googleRef} action={googleSignInAction} hidden />
      <GoogleAuthButton onClick={google} loading={connecting} />

      <p className="mt-[26px] text-sm text-text-muted">
        {t("noAccount")}{" "}
        <Link href="/regjistrohu" className="font-bold text-brand-500 hover:underline">
          {t("register")}
        </Link>
      </p>

      {demoEnabled ? (
        <Link
          href="/demo"
          className="mt-5 block rounded-control border border-dashed border-field-line p-3 text-center text-sm text-text-muted transition-colors hover:border-brand-500/50 hover:text-text"
        >
          {tAuth("demoHint")}
        </Link>
      ) : null}
    </div>
  );
}
