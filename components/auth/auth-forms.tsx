"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AtSign, KeyRound, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { VerifiedMark } from "@/components/identity/verified-mark";
import { googleSignInAction, registerAction } from "@/lib/actions/auth";
import { IDLE } from "@/lib/actions/types";
import { isInstitutionalEmail } from "@/lib/types";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden focusable="false">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.6-5.2 3.6-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-5 6.7-5z" />
    </svg>
  );
}

export function GoogleButton() {
  const t = useTranslations("auth");
  return (
    <form action={googleSignInAction}>
      <Button type="submit" variant="secondary" size="lg" className="w-full">
        <GoogleMark />
        {t("google")}
      </Button>
    </form>
  );
}

export function RegisterForm({
  googleEnabled,
  inviteCode,
  inviterName,
}: {
  googleEnabled: boolean;
  inviteCode?: string;
  inviterName?: string;
}) {
  const router = useRouter();
  const t = useTranslations("auth");
  /*
    Gabimi vjen si rrugë e plotë çelësi.

    Disa vijnë nga vetë hyrja («auth.errorCredentials»), të tjerat nga rregulla
    të përbashkëta («errors.rateLimited»). Dikur këtu hiqej vetëm prefiksi
    «auth.», prandaj çelësat e tjerë dilnin te faqja si tekst i papërkthyer:
    studenti lexonte «auth.errors.rateLimited» në vend të një fjalie.
  */
  const tAll = useTranslations();
  const [state, action, pending] = React.useActionState(registerAction, IDLE);
  const [email, setEmail] = React.useState("");

  React.useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const institutional = email.includes("@") && isInstitutionalEmail(email);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl text-text">{t("registerTitle")}</h1>
        <p className="text-sm text-text-muted">{t("registerBody")}</p>
      </div>

      {inviterName ? (
        <div className="rounded-md border border-brand-500/30 bg-brand-500/8 p-3">
          <p className="text-sm text-text">{t("invitedBy", { name: inviterName })}</p>
          <p className="mt-0.5 text-xs text-text-muted">{t("invitedBody")}</p>
        </div>
      ) : null}

      {googleEnabled ? (
        <>
          <GoogleButton />
          <Separator label={t("orEmail")} />
        </>
      ) : null}

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="inviteCode" value={inviteCode ?? ""} />

        <Field
          label={t("name")}
          htmlFor="name"
          error={state.fieldErrors?.name ? t(state.fieldErrors.name) : undefined}
        >
          <Input id="name" name="name" required autoComplete="name" icon={<User />} placeholder={t("nameHint")} />
        </Field>

        <Field
          label={t("email")}
          htmlFor="email"
          error={
            state.fieldErrors?.email
              ? t(state.fieldErrors.email as "errorEmail" | "errorEmailTakenHint" | "errorEmailDisposable")
              : undefined
          }
          help={t("emailHelp")}
        >
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            icon={<AtSign />}
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        {institutional ? (
          <p className="-mt-2 inline-flex items-center gap-1.5 text-xs text-success-text">
            <VerifiedMark size="sm" withTooltip={false} />
            {t("institutional")}
          </p>
        ) : null}

        <Field
          label={t("password")}
          htmlFor="password"
          error={state.fieldErrors?.password ? t("errorPassword") : undefined}
          help={t("passwordHint")}
        >
          <Input id="password" name="password" type="password" required autoComplete="new-password" icon={<KeyRound />} />
        </Field>

        <label
          htmlFor="ageConfirmed"
          className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface p-3"
        >
          <Checkbox id="ageConfirmed" name="ageConfirmed" className="mt-0.5" required />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm text-text">{t("ageConfirm")}</span>
            <span className="text-xs text-text-muted">{t("ageBody")}</span>
          </span>
        </label>

        {state.messageKey && !state.ok ? (
          <p className="rounded-sm border border-danger/30 bg-danger/8 px-3 py-2 text-sm text-danger-text">
            {tAll(state.messageKey, state.values)}
          </p>
        ) : null}

        <Button type="submit" size="lg" loading={pending}>
          {t("registerCta")}
        </Button>

        <p className="text-xs text-text-muted">{t("terms")}</p>
      </form>

      <p className="text-sm text-text-muted">
        {t("haveAccount")}{" "}
        <Link href="/hyr" className="font-medium text-brand-500 hover:underline">
          {t("loginHere")}
        </Link>
      </p>
    </div>
  );
}
