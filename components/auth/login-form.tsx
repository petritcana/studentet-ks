"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AtSign, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { loginAction } from "@/lib/actions/auth";
import { IDLE } from "@/lib/actions/types";
import { GoogleButton } from "./google-button";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [state, action, pending] = React.useActionState(loginAction, IDLE);

  React.useEffect(() => {
    if (state.ok) {
      router.replace("/feed");
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl text-text">Mirë se u ktheve</h1>
        <p className="text-sm text-text-muted">
          Orari, materialet dhe gjenerata jote të presin aty ku i le.
        </p>
      </div>

      {googleEnabled ? (
        <>
          <GoogleButton label="Vazhdo me Google" />
          <Separator label="ose me email" />
        </>
      ) : null}

      <form action={action} className="flex flex-col gap-4">
        <Field
          label="Email"
          htmlFor="email"
          error={state.fieldErrors?.email}
        >
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            icon={<AtSign />}
            placeholder="emri.mbiemri@student.uni-pr.edu"
          />
        </Field>

        <Field
          label="Fjalëkalimi"
          htmlFor="password"
          error={state.fieldErrors?.password}
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            icon={<KeyRound />}
            placeholder="Të paktën 8 shkronja"
          />
        </Field>

        {state.message && !state.ok ? (
          <p className="rounded-sm border border-danger/30 bg-danger/8 px-3 py-2 text-sm text-danger-text">
            {state.message}
          </p>
        ) : null}

        <Button type="submit" size="lg" loading={pending}>
          Hyr
        </Button>
      </form>

      <p className="text-sm text-text-muted">
        S&apos;ke llogari?{" "}
        <Link href="/regjistrohu" className="font-medium text-brand-500 hover:underline">
          Regjistrohu për një minutë
        </Link>
      </p>

      <div className="rounded-md border border-border bg-surface-2 p-3">
        <p className="text-xs font-medium text-text">Llogari demonstruese</p>
        <p className="mt-1 text-xs text-text-muted">
          demo@student.uni-pr.edu · fjalëkalimi: provoje123
        </p>
      </div>
    </div>
  );
}
