"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Gift, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { findProCandidates, grantPro, revokePro, type ProCandidate } from "@/lib/actions/admin-pro";
import { cn } from "@/lib/utils";

const QUICK_HOURS = [24, 48, 168, 720] as const;

/** Orët me fjalë: «48 orë = 2 ditë», «30 orë = 1 ditë e 6 orë». */
function useDuration() {
  const t = useTranslations("adminPro");
  return (hours: number) => {
    const days = Math.floor(hours / 24);
    const rest = hours % 24;
    if (days === 0) return t("durationHours", { hours });
    if (rest === 0) return t("durationDays", { hours, days });
    return t("durationMixed", { hours, days, rest });
  };
}

/**
 * «Jep Pro»: admini gjen personin, shkruan orët dhe e jep. Pro-ja shtohet mbi atë
 * që ka personi dhe mbaron vetë. Personi merr njoftim.
 */
export function ProGrantPanel() {
  const t = useTranslations("adminPro");
  const tAll = useTranslations();
  const router = useRouter();
  const duration = useDuration();
  const [query, setQuery] = React.useState("");
  const [people, setPeople] = React.useState<ProCandidate[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [chosen, setChosen] = React.useState<ProCandidate | null>(null);
  const [hours, setHours] = React.useState("48");
  const [reason, setReason] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (query.trim().length < 2) return;
    let alive = true;
    const timer = window.setTimeout(() => {
      setSearching(true);
      void findProCandidates(query).then((rows) => {
        if (!alive) return;
        setPeople(rows);
        setSearching(false);
      });
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const value = Number.parseInt(hours, 10);
  const valid = Number.isInteger(value) && value >= 1 && value <= 24 * 365;

  function grant() {
    if (!chosen || !valid) return;
    startTransition(async () => {
      const result = await grantPro({ userId: chosen.id, hours: value, reason: reason || undefined });
      if (!result.ok) {
        toast.error(tAll(result.messageKey ?? "common.retry", result.values));
        return;
      }
      toast.success(t("grantedTo", { name: chosen.name.split(" ")[0], duration: duration(value) }));
      setChosen(null);
      setQuery("");
      setPeople([]);
      setReason("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4" data-pro-grant>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pro-search" className="text-sm font-semibold text-text">
          {t("who")}
        </label>
        <Input
          id="pro-search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (event.target.value.trim().length < 2) setPeople([]);
          }}
          placeholder={t("searchPlaceholder")}
          icon={<Search />}
          data-pro-search
        />
        {query.trim().length >= 2 ? (
          <ul className="flex flex-col gap-1" aria-busy={searching}>
            {people.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => setChosen(person)}
                  aria-pressed={chosen?.id === person.id}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-control border px-3 py-2 text-left transition-colors",
                    chosen?.id === person.id ? "border-brand-500 bg-brand-50" : "border-transparent hover:bg-surface-2",
                  )}
                  data-pro-candidate={person.username}
                >
                  <Avatar name={person.name} src={person.avatar} size="sm" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-text">{person.name}</span>
                    <span className="truncate text-xs text-text-muted">
                      @{person.username} · {person.email}
                    </span>
                  </span>
                  {person.proUntil ? <span className="rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-bold text-success-text">{t("hasPro")}</span> : null}
                  {chosen?.id === person.id ? <Check className="size-4 text-brand-500" aria-hidden /> : null}
                </button>
              </li>
            ))}
            {!searching && people.length === 0 ? <li className="px-1 text-xs text-text-muted">{t("noMatch")}</li> : null}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pro-hours" className="text-sm font-semibold text-text">
          {t("hours")}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="pro-hours"
            type="number"
            inputMode="numeric"
            min={1}
            max={24 * 365}
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            className="w-28"
            data-pro-hours
          />
          {QUICK_HOURS.map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={() => setHours(String(quick))}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                value === quick ? "border-brand-500 bg-brand-50 text-brand-500" : "border-border text-text-muted hover:text-text",
              )}
            >
              {t(`quick_${quick}`)}
            </button>
          ))}
        </div>
        <p className={cn("text-xs", valid ? "text-text-muted" : "text-danger-text")} aria-live="polite">
          {valid ? duration(value) : t("hoursInvalid")}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pro-reason" className="text-sm font-semibold text-text">
          {t("reason")}
        </label>
        <Input id="pro-reason" value={reason} maxLength={200} onChange={(event) => setReason(event.target.value)} placeholder={t("reasonPlaceholder")} />
      </div>

      <Button onClick={grant} disabled={!chosen || !valid} loading={pending} className="self-start" data-pro-give>
        <Gift />
        {chosen ? t("giveTo", { name: chosen.name.split(" ")[0] }) : t("give")}
      </Button>
    </div>
  );
}

export function RevokeProButton({ userId, name }: { userId: string; name: string }) {
  const t = useTranslations("adminPro");
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  if (!confirming) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setConfirming(true)} className="text-danger-text" data-pro-revoke>
        {t("revoke")}
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      variant="danger"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          await revokePro(userId);
          toast.success(t("revokedFrom", { name }));
          router.refresh();
        })
      }
      data-pro-revoke-confirm
    >
      {t("revokeConfirm", { name })}
    </Button>
  );
}
