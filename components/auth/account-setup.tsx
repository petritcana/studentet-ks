"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, AtSign, CalendarDays, Check, AlertCircle, KeyRound, Lock, User } from "lucide-react";
import { suggestUsername } from "@/lib/actions/username-suggest";
import { setGooglePassword, switchGoogleAccount } from "@/lib/actions/google-account";
import { canContinue, passwordRules, passwordScore } from "@/lib/password-rules";
import { birthDateBounds, checkBirthDate } from "@/lib/age";
import { cn, initialsOf } from "@/lib/utils";
import {
  AuthAlert,
  AuthButton,
  AuthField,
  AuthHeading,
  AuthInput,
  AuthStepper,
  ButtonSpinner,
  GoogleG,
  PasswordInput,
} from "./auth-ui";

const RULES = ["length", "upper", "number", "symbol"] as const;
const FLOW = ["flow_id", "flow_institution", "flow_program", "flow_year", "flow_photo", "flow_bio"] as const;

/** Ngjyra e shiritit sipas fuqisë: e dobët e kuqe, mesatare ari, e mirë blu, e fortë e gjelbër. */
const METER = ["", "bg-danger", "bg-warning", "bg-brand-500", "bg-success"] as const;
const METER_TEXT = ["", "text-danger-text", "text-warning-text", "text-brand-500", "text-success-text"] as const;

/**
 * «Krijo llogarinë tënde», pas hapit me Google.
 *
 * Emri dhe emaili vijnë nga Google dhe nuk ndryshohen këtu. Username-i krijohet
 * nga emri dhe kontrollohet në bazë (pa u rezervuar): kur është i zënë, merret
 * varianti i lirë i radhës. Password-i është vetëm për Studentët.KS. «Vazhdo»
 * hapet kur password-i ka 8+ shkronja, plotëson tri rregulla dhe përputhet.
 */
export function AccountSetup({
  profile,
  verifiedStudent,
  username: reserved,
  nextHref,
  live = false,
}: {
  profile: { name: string; email: string };
  /** Emaili është institucional: karta thotë «Student i verifikuar». */
  verifiedStudent: boolean;
  /** Username-i i llogarisë së krijuar nga Google. Pa të (demo) kërkohet një sugjerim. */
  username?: { base: string; username: string };
  /** Ku vazhdon onboarding-u ekzistues. Null kur nuk ka sesion: atëherë del pamja demonstruese. */
  nextHref: string | null;
  /** Llogari e vërtetë nga Google: password-i ruhet në server. */
  live?: boolean;
}) {
  const t = useTranslations("authFlow");
  const tAll = useTranslations();
  const router = useRouter();
  const [suggested, setSuggested] = React.useState<{ base: string; username: string } | null>(null);
  const username = reserved ?? suggested;
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [birthDate, setBirthDate] = React.useState("");
  const bounds = React.useMemo(() => birthDateBounds(), []);
  const birth = birthDate ? checkBirthDate(birthDate) : null;
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, startSaving] = React.useTransition();

  React.useEffect(() => {
    // Llogaria e vërtetë e ka username-in; vetëm demo e kërkon.
    if (reserved) return;
    let alive = true;
    void suggestUsername(profile.name, profile.email).then((result) => {
      if (alive) setSuggested(result);
    });
    return () => {
      alive = false;
    };
  }, [reserved, profile.name, profile.email]);

  const rules = passwordRules(password);
  const score = passwordScore(password);
  const ready = canContinue(password, confirm) && Boolean(birth?.ok);
  const firstName = profile.name.split(" ")[0];

  function next() {
    if (!ready) return;
    if (live) {
      setError(null);
      startSaving(async () => {
        // Serveri e ruan password-in dhe e çon studentin te onboarding-u.
        const result = await setGooglePassword(password, confirm, birthDate);
        if (result && !result.ok) setError(tAll(result.messageKey ?? "common.retry"));
      });
      return;
    }
    if (nextHref) {
      router.push(nextHref);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div data-auth-screen="handoff">
        <AuthAlert tone="success" title={t("handoffTitle", { name: firstName })}>
          {t("handoffBody")}
        </AuthAlert>
        <p className="text-[15.5px] text-text-muted">{t("handoffDemo")}</p>
        <Link href="/regjistrohu" className="mt-6 inline-flex font-bold text-brand-500 hover:underline">
          {t("backToStart")}
        </Link>
      </div>
    );
  }

  return (
    <div data-auth-screen="setup">
      <AuthStepper
        steps={[
          { label: t("stepGoogle"), state: "done" },
          { label: t("stepAccount"), state: "current" },
          { label: t("stepInstitution"), state: "todo" },
          { label: t("stepFaculty"), state: "todo" },
        ]}
        more={t("stepsMore", { count: 5 })}
      />
      <AuthHeading title={t("setupTitle")} lead={t("setupLead")} />

      {/* Karta e verifikimit: e gjelbër, sepse Google e vërtetoi emailin studentor. */}
      <div
        className="mb-[22px] flex flex-wrap items-center gap-3.5 rounded-[16px] border border-success/35 bg-gradient-to-br from-success-50 to-field/40 px-4 py-3.5"
        data-verified-card
      >
        <span className="relative grid size-[46px] shrink-0 place-items-center rounded-full bg-primary bg-primary-grad text-[15px] font-bold text-on-primary">
          {initialsOf(profile.name)}
          <span className="absolute -bottom-1 -right-1 grid size-[22px] place-items-center rounded-full bg-google-bg shadow-[0_0_0_2.5px_var(--bg)]">
            <GoogleG className="size-[13px]" />
          </span>
        </span>
        {/* Në celular teksti merr tërë rreshtin pranë avatarit, dhe shenja kalon poshtë. */}
        <span className="flex min-w-0 flex-1 flex-col max-[559px]:basis-[calc(100%-64px)]">
          <b className="break-all text-[14.5px] text-text">{profile.email}</b>
          <small className="text-[13px] text-text-muted">{t(verifiedStudent ? "verifiedBy" : "emailVerifiedBy")}</small>
          {live ? (
            <form action={switchGoogleAccount}>
              <button type="submit" className="mt-0.5 text-[12.5px] font-bold text-brand-500 hover:underline" data-switch-account>
                {t("otherAccount")}
              </button>
            </form>
          ) : (
            <Link href="/regjistrohu" className="mt-0.5 text-[12.5px] font-bold text-brand-500 hover:underline">
              {t("otherAccount")}
            </Link>
          )}
        </span>
        {verifiedStudent ? (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-success-50 px-2.5 py-1 text-xs font-bold text-success-text max-[559px]:ml-[60px]">
            <Check className="size-3.5 stroke-[2.6]" aria-hidden />
            {t("verifiedPill")}
          </span>
        ) : null}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-2.5 min-[560px]:grid-cols-2">
        <div className="rounded-control border border-field-line bg-field/60 px-3.5 py-3 text-[12.5px] leading-[1.45] text-text-muted">
          <b className="mb-1 flex items-center gap-2 text-[13.5px] text-text">
            <GoogleG className="size-[18px]" />
            {t("tileGoogleTitle")}
          </b>
          {t("tileGoogleBody")}
        </div>
        <div className="rounded-control border border-field-line bg-field/60 px-3.5 py-3 text-[12.5px] leading-[1.45] text-text-muted">
          <b className="mb-1 flex items-center gap-2 text-[13.5px] text-text">
            <KeyRound className="size-[18px] text-brand-600" aria-hidden />
            {t("tilePlatformTitle")}
          </b>
          {t("tilePlatformBody")}
        </div>
      </div>

      <SectionTitle>{t("fromGoogle")}</SectionTitle>
      <AuthField label={t("fullName")} htmlFor="setup-name">
        <AuthInput
          id="setup-name"
          value={profile.name}
          readOnly
          icon={<User aria-hidden />}
          trailing={<LockTag label={t("lockGoogle")} />}
        />
      </AuthField>

      <AuthField
        label={t("username")}
        htmlFor="setup-username"
        aside={
          username ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-xs font-bold text-success-text" data-username-status="free">
              <Check className="size-[13px] stroke-[2.8]" aria-hidden />
              {t("available")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-600" data-username-status="checking">
              <ButtonSpinner className="size-3 border-2" />
              {t("checking")}
            </span>
          )
        }
        help={
          <span>
            {username && username.username !== username.base ? (
              <>{t("usernameTaken", { base: username.base, username: username.username })} </>
            ) : null}
            {t.rich("usernameHelp", {
              b: (chunks) => <b className="text-text-muted">{chunks}</b>,
              username: username?.username ?? "…",
            })}
          </span>
        }
        helpId="setup-username-help"
      >
        <AuthInput
          id="setup-username"
          value={username?.username ?? ""}
          readOnly
          tone={username ? "ok" : undefined}
          icon={<AtSign aria-hidden />}
          trailing={<LockTag label={t("lockAuto")} />}
          aria-describedby="setup-username-help"
        />
      </AuthField>

      <SectionTitle>{t("aboutYouSection")}</SectionTitle>
      <AuthField
        label={t("birthDate")}
        htmlFor="setup-birth"
        help={
          birth && !birth.ok ? (
            <>
              <AlertCircle aria-hidden />
              {tAll(`auth.${birth.reason}`)}
            </>
          ) : (
            t("birthHelp")
          )
        }
        helpTone={birth && !birth.ok ? "error" : "muted"}
        helpId="setup-birth-help"
      >
        <AuthInput
          id="setup-birth"
          type="date"
          value={birthDate}
          min={bounds.min}
          max={bounds.max}
          onChange={(event) => setBirthDate(event.target.value)}
          icon={<CalendarDays aria-hidden />}
          tone={birth ? (birth.ok ? "ok" : "error") : undefined}
          aria-describedby="setup-birth-help"
          data-birth-date
        />
      </AuthField>

      <SectionTitle>{t("passwordSection")}</SectionTitle>
      <AuthField label={t("newPassword")} htmlFor="setup-password">
        <PasswordInput
          id="setup-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          placeholder={t("newPasswordPlaceholder")}
          icon={<KeyRound aria-hidden />}
          tone={score === 4 ? "ok" : undefined}
          aria-describedby="setup-password-strength setup-password-rules"
        />
        <div className="mt-2.5 flex gap-1.5" aria-hidden>
          {[1, 2, 3, 4].map((segment) => (
            <i key={segment} className={cn("h-[5px] flex-1 rounded-[3px] bg-field-line", segment <= score && METER[score])} />
          ))}
        </div>
        <p id="setup-password-strength" className="mt-1.5 flex justify-between text-[12.5px] text-text-dim" aria-live="polite">
          <span>{t("strengthLabel")}</span>
          <b className={cn("font-bold", METER_TEXT[score])}>{score ? t(`strength_${score}`) : t("strengthEmpty")}</b>
        </p>
        <ul
          id="setup-password-rules"
          className="mt-2.5 grid grid-cols-1 gap-x-3.5 gap-y-1.5 rounded-[12px] border border-field-line bg-field/55 px-3.5 py-3 min-[560px]:grid-cols-2"
        >
          {RULES.map((rule) => (
            <li key={rule} className={cn("flex items-center gap-2 text-[12.5px]", rules[rule] ? "text-text" : "text-text-dim")} data-rule={rule} data-ok={rules[rule]}>
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
        label={t("confirmPassword")}
        htmlFor="setup-confirm"
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
        helpId="setup-confirm-help"
      >
        <PasswordInput
          id="setup-confirm"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
          placeholder={t("confirmPlaceholder")}
          icon={<KeyRound aria-hidden />}
          tone={confirm ? (confirm === password ? "ok" : "error") : undefined}
          aria-describedby={confirm ? "setup-confirm-help" : undefined}
        />
      </AuthField>

      {error ? <AuthAlert tone="error" title={error} /> : null}
      <AuthButton type="button" disabled={!ready} loading={saving} loadingLabel={t("saving")} onClick={next} data-setup-continue>
        {t("continue")}
        <ArrowRight className="size-[18px]" aria-hidden />
      </AuthButton>

      <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs" aria-label={t("then")}>
        <span className="text-text-dim">{t("then")}</span>
        {FLOW.map((step, index) => (
          <React.Fragment key={step}>
            {index > 0 ? <span className="text-text-dim" aria-hidden>→</span> : null}
            <span className="rounded-[10px] border border-field-line bg-field px-2.5 py-1.5 font-semibold text-text-muted">{t(step)}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3.5 mt-1.5 flex items-center gap-2.5 font-sans text-[13px] font-extrabold uppercase tracking-[0.06em] text-text-dim after:h-px after:flex-1 after:bg-field-line">
      {children}
    </h2>
  );
}

function LockTag({ label }: { label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-text-dim">
      <Lock className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}
