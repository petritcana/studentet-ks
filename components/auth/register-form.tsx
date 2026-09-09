"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AtSign, BadgeCheck, KeyRound, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { registerAction } from "@/lib/actions/auth";
import { IDLE } from "@/lib/actions/types";
import { isInstitutionalEmail } from "@/lib/constants";
import { GoogleButton } from "./google-button";

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
  const [state, action, pending] = React.useActionState(registerAction, IDLE);
  const [email, setEmail] = React.useState("");

  React.useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const institutional = email.includes("@") && isInstitutionalEmail(email);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl text-text">Nis llogarinë tënde</h1>
        <p className="text-sm text-text-muted">
          Një minutë. Dilesh me orarin, materialet dhe njerëzit e gjeneratës sate.
        </p>
      </div>

      {inviterName ? (
        <div className="rounded-md border border-brand-500/30 bg-brand-500/8 p-3">
          <p className="text-sm text-text">
            <span className="font-medium">{inviterName}</span> të ftoi.
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            Sapo të regjistrohesh, bëheni shokë automatikisht.
          </p>
        </div>
      ) : null}

      {googleEnabled ? (
        <>
          <GoogleButton label="Vazhdo me Google" />
          <Separator label="ose me email" />
        </>
      ) : null}

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="inviteCode" value={inviteCode ?? ""} />

        <Field label="Emri dhe mbiemri" htmlFor="name" error={state.fieldErrors?.name}>
          <Input
            id="name"
            name="name"
            required
            autoComplete="name"
            icon={<User />}
            placeholder="Ashtu si të thërrasin në fakultet"
          />
        </Field>

        <Field
          label="Email"
          htmlFor="email"
          error={state.fieldErrors?.email}
          help="Emaili institucional të jep badge-in I verifikuar menjëherë."
        >
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            icon={<AtSign />}
            placeholder="emri.mbiemri@student.uni-pr.edu"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        {institutional ? (
          <p className="-mt-2 inline-flex items-center gap-1.5 text-xs text-success-text">
            <BadgeCheck className="size-3.5" />E njohëm si email institucional. Merr badge-in
            menjëherë.
          </p>
        ) : null}

        <Field
          label="Fjalëkalimi"
          htmlFor="password"
          error={state.fieldErrors?.password}
          help="Të paktën 8 shkronja."
        >
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            icon={<KeyRound />}
          />
        </Field>

        <label
          htmlFor="ageConfirmed"
          className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface p-3"
        >
          <Checkbox id="ageConfirmed" name="ageConfirmed" className="mt-0.5" required />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm text-text">Kam mbushur 16 vjeç</span>
            <span className="text-xs text-text-muted">
              Kjo është mosha minimale për të përdorur platformën.
            </span>
          </span>
        </label>
        {state.fieldErrors?.ageConfirmed ? (
          <p className="-mt-2 text-xs text-danger-text">{state.fieldErrors.ageConfirmed}</p>
        ) : null}

        {state.message && !state.ok ? (
          <p className="rounded-sm border border-danger/30 bg-danger/8 px-3 py-2 text-sm text-danger-text">
            {state.message}
          </p>
        ) : null}

        <Button type="submit" size="lg" loading={pending}>
          Krijo llogarinë
        </Button>

        <p className="text-xs text-text-muted">
          Duke vazhduar pranon{" "}
          <Link href="/kushtet" className="text-brand-500 hover:underline">
            kushtet e përdorimit
          </Link>{" "}
          dhe{" "}
          <Link href="/privatesia" className="text-brand-500 hover:underline">
            politikën e privatësisë
          </Link>
          .
        </p>
      </form>

      <p className="text-sm text-text-muted">
        Ke llogari?{" "}
        <Link href="/hyr" className="font-medium text-brand-500 hover:underline">
          Hyr këtu
        </Link>
      </p>
    </div>
  );
}
