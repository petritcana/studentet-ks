"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertCircle, ArrowRight, Check, KeyRound } from "lucide-react";
import { resetPassword, setPasswordAfterGoogle } from "@/lib/actions/password-reset";
import { canContinue, passwordRules } from "@/lib/password-rules";
import { cn } from "@/lib/utils";
import { AuthAlert, AuthButton, AuthField, AuthHeading, PasswordInput } from "./auth-ui";

const RULES = ["length", "upper", "number", "symbol"] as const;

/**
 * «Krijo password të ri» dhe «Përsërit password-in».
 *
 * Dy rrugë e sjellin këtu: Google (`mode="google"`, studenti sapo u konfirmua
 * dhe mbetet brenda) ose lidhja me email (`token`). Të njëjtat rregulla si te
 * krijimi i llogarisë, të kontrolluara live këtu dhe prapë te serveri.
 */
export function ResetScreen({ token, name, mode = "token" }: { token?: string; name: string; mode?: "token" | "google" }) {
  const t = useTranslations("authFlow");
  const tAll = useTranslations();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const rules = passwordRules(password);
  const ready = canContinue(password, confirm);

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setSaving(true);
    setError(null);
    const save = mode === "google" ? setPasswordAfterGoogle(password, confirm) : resetPassword(token ?? "", password, confirm);
    void save.then((result) => {
      setSaving(false);
      if (!result.ok) {
        setError(tAll(result.messageKey ?? "common.retry"));
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div data-auth-screen="reset-done">
        <AuthHeading title={t("resetDoneTitle")} lead={mode === "google" ? t("resetDoneGoogleLead") : t("resetDoneLead")} />
        <Link
          href={mode === "google" ? "/feed" : "/hyr"}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-control bg-primary bg-primary-grad font-semibold text-on-primary"
          data-reset-login
        >
          {mode === "google" ? t("goToPlatform") : t("goToLogin")}
          <ArrowRight className="size-[18px]" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={save} noValidate data-auth-screen="reset">
      <AuthHeading title={t("resetTitle")} lead={t("resetLead", { name: name.split(" ")[0] })} />
      <AuthField label={t("resetNewPassword")} htmlFor="reset-password">
        <PasswordInput
          id="reset-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          placeholder={t("newPasswordPlaceholder")}
          icon={<KeyRound aria-hidden />}
          aria-describedby="reset-password-rules"
        />
        <ul
          id="reset-password-rules"
          className="mt-2.5 grid grid-cols-1 gap-x-3.5 gap-y-1.5 rounded-[12px] border border-field-line bg-field/55 px-3.5 py-3 min-[560px]:grid-cols-2"
        >
          {RULES.map((rule) => (
            <li key={rule} className={cn("flex items-center gap-2 text-[12.5px]", rules[rule] ? "text-text" : "text-text-dim")}>
              <span
                className={cn(
                  "grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px]",
                  rules[rule] ? "border-success bg-success text-bg" : "border-field-line-strong",
                )}
              >
                {rules[rule] ? <Check className="size-[11px] stroke-[3]" aria-hidden /> : null}
              </span>
              {t(`rule_${rule}`)}
            </li>
          ))}
        </ul>
      </AuthField>
      <AuthField
        label={t("resetConfirmPassword")}
        htmlFor="reset-confirm"
        help={
          confirm ? (
            confirm === password ? (
              <>
                <Check aria-hidden />
                {t("match")}
              </>
            ) : (
              <>
                <AlertCircle aria-hidden />
                {t("mismatch")}
              </>
            )
          ) : undefined
        }
        helpTone={confirm ? (confirm === password ? "ok" : "error") : "muted"}
        helpId="reset-confirm-help"
      >
        <PasswordInput
          id="reset-confirm"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
          placeholder={t("confirmPlaceholder")}
          icon={<KeyRound aria-hidden />}
          tone={confirm ? (confirm === password ? "ok" : "error") : undefined}
        />
      </AuthField>
      {error ? <AuthAlert tone="error" title={error} /> : null}
      <AuthButton type="submit" disabled={!ready} loading={saving} loadingLabel={t("saving")} data-reset-submit>
        {t("resetSave")}
      </AuthButton>
    </form>
  );
}
