"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { changePassword } from "@/lib/actions/password";
import { canContinue, passwordRules } from "@/lib/password-rules";
import { cn } from "@/lib/utils";

const RULES = ["length", "upper", "number", "symbol"] as const;

/**
 * «Ndrysho password-in»: i vjetri, i riu dy herë. Rregullat dalin ndërsa shkruan,
 * dhe butoni hapet vetëm kur i riu i plotëson dhe përputhet. Serveri i kontrollon
 * prapë (`changePassword`).
 */
export function PasswordChange() {
  const t = useTranslations("password");
  const tf = useTranslations("authFlow");
  const tAll = useTranslations();
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [shown, setShown] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const rules = passwordRules(next);
  const ready = current.length > 0 && canContinue(next, confirm);
  const type = shown ? "text" : "password";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setError(null);
    startTransition(async () => {
      const result = await changePassword(current, next, confirm);
      if (!result.ok) {
        setError(tAll(result.messageKey ?? "common.retry"));
        return;
      }
      toast.success(t("changed"));
      setCurrent("");
      setNext("");
      setConfirm("");
    });
  }

  return (
    <Card id="password" className="scroll-mt-24 p-4 sm:p-5" data-password-change>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
              <KeyRound className="size-4 text-brand-500" aria-hidden />
              {t("title")}
            </h2>
            <p className="measure text-xs text-text-muted">{t("body")}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShown((value) => !value)}
            aria-pressed={shown}
            aria-label={tf(shown ? "hidePassword" : "showPassword")}
            title={tf(shown ? "hidePassword" : "showPassword")}
          >
            {shown ? <EyeOff /> : <Eye />}
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password-current">{t("current")}</Label>
          <Input
            id="password-current"
            type={type}
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
          />
          <Link href="/harrova-password" className="self-start text-xs font-semibold text-brand-500 hover:underline">
            {t("forgot")}
          </Link>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password-new">{t("new")}</Label>
          <Input
            id="password-new"
            type={type}
            autoComplete="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            aria-describedby="password-rules"
          />
          <ul id="password-rules" className="grid grid-cols-2 gap-x-3 gap-y-1">
            {RULES.map((rule) => (
              <li
                key={rule}
                className={cn("flex items-center gap-1.5 text-xs", rules[rule] ? "text-success-text" : "text-text-muted")}
                data-rule={rule}
                data-ok={rules[rule]}
              >
                <Check className={cn("size-3.5", !rules[rule] && "opacity-30")} aria-hidden />
                {tf(`rule_${rule}`)}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password-confirm">{t("confirm")}</Label>
          <Input
            id="password-confirm"
            type={type}
            autoComplete="new-password"
            value={confirm}
            invalid={confirm.length > 0 && confirm !== next}
            onChange={(event) => setConfirm(event.target.value)}
          />
          {confirm ? (
            <p className={cn("text-xs", confirm === next ? "text-success-text" : "text-danger-text")}>
              {confirm === next ? tf("match") : tf("mismatch")}
            </p>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-text" data-password-error>
            {error}
          </p>
        ) : null}

        <Button type="submit" className="self-start" loading={pending} disabled={!ready} data-password-submit>
          {t("submit")}
        </Button>
      </form>
    </Card>
  );
}
