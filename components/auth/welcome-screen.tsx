"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mail, ShieldCheck } from "lucide-react";
import { googleSignInAction } from "@/lib/actions/auth";
import { DEMO_GOOGLE_DELAY_MS } from "@/lib/auth-demo";
import { AuthButton, AuthHeading, AuthHint, GoogleAuthButton, OrDivider } from "./auth-ui";

/**
 * «Mirë se vjen»: hyrja e parë e regjistrimit.
 *
 * Google është zgjedhja e rekomanduar, sepse emailat studentorë janë llogari
 * Google. Pa Google të lidhur (`googleEnabled`), butoni është demonstrues: pret
 * pak dhe çon te `/regjistrohu/llogaria`. «Vazhdo me email studentor» hap
 * formularin ekzistues, të pandryshuar.
 */
export function WelcomeScreen({
  googleEnabled,
  emailHref,
  inviterName,
}: {
  googleEnabled: boolean;
  /** Formulari me email, me kodin e ftesës kur ka. */
  emailHref: string;
  inviterName?: string;
}) {
  const t = useTranslations("authFlow");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const [connecting, setConnecting] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  function google() {
    setConnecting(true);
    if (googleEnabled) {
      formRef.current?.requestSubmit();
      return;
    }
    window.setTimeout(() => router.push("/regjistrohu/llogaria"), DEMO_GOOGLE_DELAY_MS);
  }

  return (
    <div data-auth-screen="welcome">
      <AuthHeading title={t("welcomeTitle")} lead={t("welcomeLead")} />

      {inviterName ? (
        <div className="mb-5 rounded-control border border-brand-500/30 bg-brand-50 p-3">
          <p className="text-sm text-text">{tAuth("invitedBy", { name: inviterName })}</p>
          <p className="mt-0.5 text-xs text-text-muted">{tAuth("invitedBody")}</p>
        </div>
      ) : null}

      {/* Kur Google është lidhur, butoni dërgon formularin e vërtetë të hyrjes me Google. */}
      <form ref={formRef} action={googleSignInAction} hidden />
      <GoogleAuthButton onClick={google} loading={connecting} recommended />

      <OrDivider label={t("or")} />

      <AuthButton tone="outline" type="button" onClick={() => router.push(emailHref)} data-email-signup>
        <Mail className="size-[18px]" aria-hidden />
        {t("continueEmail")}
      </AuthButton>

      <AuthHint icon={<ShieldCheck />} className="mt-[22px]">
        {t.rich("hintStudent", { b: (chunks) => <b>{chunks}</b>, domain: "@student.uni-pr.edu" })}
      </AuthHint>

      <p className="mt-[26px] text-sm text-text-muted">
        {t("haveAccount")}{" "}
        <Link href="/hyr" className="font-bold text-brand-500 hover:underline">
          {t("loginHere")}
        </Link>
      </p>
      <p className="mt-3.5 text-[12.5px] text-text-dim">
        {t.rich("legal", {
          terms: (chunks) => (
            <Link href="/ligjore/kushtet" className="underline hover:text-text">
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href="/ligjore/privatesia" className="underline hover:text-text">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
