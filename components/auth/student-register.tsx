"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertCircle, ArrowRight, AtSign, CalendarDays, Check, GraduationCap, KeyRound, User } from "lucide-react";
import { registerAction } from "@/lib/actions/auth";
import { IDLE } from "@/lib/actions/types";
import { birthDateBounds, checkBirthDate } from "@/lib/age";
import { canContinue, passwordRules } from "@/lib/password-rules";
import { INSTITUTION_NAMES, studentDomainFor, upcomingInstitutionFor } from "@/lib/student-domains";
import { cn } from "@/lib/utils";
import { AuthAlert, AuthButton, AuthField, AuthHeading, AuthInput, AuthStepper, PasswordInput } from "./auth-ui";

const RULES = ["length", "upper", "number", "symbol"] as const;

/**
 * Regjistrimi me email studentor, pa Google.
 *
 * Emri, mbiemri, data e lindjes, emaili studentor dhe password-i. Fushat janë të
 * kontrolluara, që një gabim nga serveri të mos i fshijë ato që shkroi studenti.
 * Emaili tregon menjëherë institucionin që njohim nga domeni; kodi niset pas
 * «Vazhdo», dhe hapi tjetër është ai ku shkruhet.
 */
export function StudentRegister({ inviteCode, inviterName }: { inviteCode?: string; inviterName?: string }) {
  const t = useTranslations("authFlow");
  const ta = useTranslations("auth");
  const tAll = useTranslations();
  const [state, action, pending] = React.useActionState(registerAction, IDLE);

  const [form, setForm] = React.useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [terms, setTerms] = React.useState(false);
  const bounds = React.useMemo(() => birthDateBounds(), []);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const birth = form.birthDate ? checkBirthDate(form.birthDate) : null;
  const emailComplete = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const domain = emailComplete ? studentDomainFor(form.email) : null;
  const upcoming = emailComplete && !domain ? upcomingInstitutionFor(form.email) : null;
  const rules = passwordRules(form.password);
  const ready =
    form.firstName.trim().length >= 2 &&
    form.lastName.trim().length >= 2 &&
    Boolean(birth?.ok) &&
    Boolean(domain) &&
    canContinue(form.password, form.confirm) &&
    terms;

  /** Gabimi i një fushe nga serveri: çelësi është brenda `auth`. */
  function fieldError(key: string) {
    const value = state.fieldErrors?.[key];
    return value ? ta(value, state.values) : null;
  }

  const emailError = fieldError("email");
  const emailHelp = emailError ? (
    <>
      <AlertCircle aria-hidden />
      {emailError}
    </>
  ) : domain ? (
    <>
      <Check aria-hidden />
      {INSTITUTION_NAMES[domain.institution] ?? domain.domain}
    </>
  ) : upcoming ? (
    <>
      <AlertCircle aria-hidden />
      {ta("errorEmailUpcoming", { institution: upcoming.name })}
    </>
  ) : emailComplete ? (
    <>
      <AlertCircle aria-hidden />
      {ta("errorEmailNotStudent")}
    </>
  ) : (
    t("studentEmailHelp")
  );
  const emailTone = emailError || (emailComplete && !domain) ? "error" : domain ? "ok" : "muted";

  return (
    <div data-auth-screen="register">
      <AuthStepper
        steps={[
          { label: t("stepDetails"), state: "current" },
          { label: t("stepCode"), state: "todo" },
          { label: t("stepId"), state: "todo" },
          { label: t("stepProfile"), state: "todo" },
        ]}
      />
      <AuthHeading title={t("registerTitle")} lead={t("registerLead")} />

      {inviterName ? (
        <div className="mb-5 rounded-control border border-brand-500/30 bg-brand-50 p-3">
          <p className="text-sm text-text">{ta("invitedBy", { name: inviterName })}</p>
          <p className="mt-0.5 text-xs text-text-muted">{ta("invitedBody")}</p>
        </div>
      ) : null}

      {state.messageKey && !state.ok && !state.fieldErrors ? (
        <AuthAlert tone="error" title={tAll(state.messageKey, state.values)} />
      ) : null}

      <form action={action} noValidate>
        <input type="hidden" name="inviteCode" value={inviteCode ?? ""} />
        <input type="hidden" name="terms" value={terms ? "on" : ""} />

        <div className="grid grid-cols-1 gap-x-3 min-[560px]:grid-cols-2">
          <AuthField
            label={t("firstName")}
            htmlFor="reg-first"
            help={fieldError("firstName") ? <><AlertCircle aria-hidden />{fieldError("firstName")}</> : undefined}
            helpTone="error"
          >
            <AuthInput
              id="reg-first"
              name="firstName"
              value={form.firstName}
              onChange={set("firstName")}
              autoComplete="given-name"
              placeholder={t("firstNamePlaceholder")}
              icon={<User aria-hidden />}
              tone={fieldError("firstName") ? "error" : undefined}
              maxLength={30}
            />
          </AuthField>
          <AuthField
            label={t("lastName")}
            htmlFor="reg-last"
            help={fieldError("lastName") ? <><AlertCircle aria-hidden />{fieldError("lastName")}</> : undefined}
            helpTone="error"
          >
            <AuthInput
              id="reg-last"
              name="lastName"
              value={form.lastName}
              onChange={set("lastName")}
              autoComplete="family-name"
              placeholder={t("lastNamePlaceholder")}
              icon={<User aria-hidden />}
              tone={fieldError("lastName") ? "error" : undefined}
              maxLength={30}
            />
          </AuthField>
        </div>

        <AuthField
          label={t("birthDate")}
          htmlFor="reg-birth"
          help={
            birth && !birth.ok ? (
              <>
                <AlertCircle aria-hidden />
                {ta(birth.reason)}
              </>
            ) : fieldError("birthDate") ? (
              <>
                <AlertCircle aria-hidden />
                {fieldError("birthDate")}
              </>
            ) : (
              t("birthHelp")
            )
          }
          helpTone={(birth && !birth.ok) || fieldError("birthDate") ? "error" : "muted"}
          helpId="reg-birth-help"
        >
          <AuthInput
            id="reg-birth"
            name="birthDate"
            type="date"
            value={form.birthDate}
            min={bounds.min}
            max={bounds.max}
            onChange={set("birthDate")}
            autoComplete="bday"
            icon={<CalendarDays aria-hidden />}
            tone={birth ? (birth.ok ? "ok" : "error") : undefined}
            aria-describedby="reg-birth-help"
            data-birth-date
          />
        </AuthField>

        <AuthField label={t("studentEmail")} htmlFor="reg-email" help={emailHelp} helpTone={emailTone} helpId="reg-email-help">
          <AuthInput
            id="reg-email"
            name="email"
            type="email"
            inputMode="email"
            value={form.email}
            onChange={set("email")}
            autoComplete="email"
            placeholder="emri.mbiemri@student.uni-pr.edu"
            icon={domain ? <GraduationCap aria-hidden /> : <AtSign aria-hidden />}
            tone={emailTone === "muted" ? undefined : emailTone}
            aria-describedby="reg-email-help"
            data-student-email={domain ? domain.institution : emailComplete ? "unknown" : undefined}
          />
        </AuthField>

        <AuthField label={t("passwordLabel")} htmlFor="reg-password">
          <PasswordInput
            id="reg-password"
            name="password"
            value={form.password}
            onChange={set("password")}
            autoComplete="new-password"
            placeholder={t("newPasswordPlaceholder")}
            icon={<KeyRound aria-hidden />}
            aria-describedby="reg-password-rules"
          />
          <ul id="reg-password-rules" className="mt-2.5 grid grid-cols-2 gap-x-3.5 gap-y-1.5">
            {RULES.map((rule) => (
              <li
                key={rule}
                className={cn("flex items-center gap-2 text-[12.5px]", rules[rule] ? "text-text" : "text-text-dim")}
                data-rule={rule}
                data-ok={rules[rule]}
              >
                <span
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-full border-[1.5px]",
                    rules[rule] ? "border-success bg-success text-bg" : "border-field-line-strong",
                  )}
                >
                  {rules[rule] ? <Check className="size-2.5 stroke-[3]" aria-hidden /> : null}
                </span>
                {t(`rule_${rule}`)}
              </li>
            ))}
          </ul>
        </AuthField>

        <AuthField
          label={t("confirmPassword")}
          htmlFor="reg-confirm"
          help={
            form.confirm ? (
              form.confirm === form.password ? (
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
          helpTone={form.confirm ? (form.confirm === form.password ? "ok" : "error") : "muted"}
        >
          <PasswordInput
            id="reg-confirm"
            name="confirm"
            value={form.confirm}
            onChange={set("confirm")}
            autoComplete="new-password"
            placeholder={t("confirmPlaceholder")}
            icon={<KeyRound aria-hidden />}
            tone={form.confirm ? (form.confirm === form.password ? "ok" : "error") : undefined}
          />
        </AuthField>

        <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-control border border-field-line bg-field/60 px-3.5 py-3 text-[13.5px] text-text-muted">
          <input
            type="checkbox"
            checked={terms}
            onChange={(event) => setTerms(event.target.checked)}
            className="mt-0.5 size-[18px] shrink-0 accent-brand-500"
            data-register-terms
          />
          <span>
            {t.rich("registerTerms", {
              terms: (chunks) => (
                <Link href="/ligjore/kushtet" className="font-bold text-brand-500 hover:underline">
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href="/ligjore/privatesia" className="font-bold text-brand-500 hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>

        <AuthButton type="submit" disabled={!ready} loading={pending} loadingLabel={t("saving")} data-register-submit>
          {t("continue")}
          <ArrowRight className="size-[18px]" aria-hidden />
        </AuthButton>
      </form>

      <p className="mt-5 text-sm text-text-muted">
        {t("haveAccount")}{" "}
        <Link href="/hyr" className="font-bold text-brand-500 hover:underline">
          {t("loginHere")}
        </Link>
      </p>
    </div>
  );
}
