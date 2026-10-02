"use client";

import { useTranslations } from "next-intl";
import { Building2, Globe, Landmark, Lock, Users } from "lucide-react";
import type { PostScope } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<PostScope, typeof Globe> = {
  faculty: Building2,
  university: Landmark,
  national: Globe,
  followers: Users,
};

/**
 * Zgjedhësi i shtrirjes.
 *
 * Opsionet e kyçura shfaqen me dry dhe tekstin «Me Pro», kurrë të fshehura.
 * Klikimi hap fletën e Pro-s me kontekstin e saktë, jo një mur të përgjithshëm.
 */
export function ScopeSelector({
  value,
  options,
  onChange,
  onLocked,
  className,
}: {
  value: PostScope;
  options: { scope: PostScope; allowed: boolean }[];
  onChange: (scope: PostScope) => void;
  onLocked: (scope: PostScope) => void;
  className?: string;
}) {
  const t = useTranslations("access");
  const tp = useTranslations("pro");
  const tf = useTranslations("feed");

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="text-sm font-semibold text-text">{tf("scope")}</p>

      {/* Lista vertikale: çdo zgjedhje thotë kush e sheh, jo vetëm emrin. */}
      <div role="radiogroup" aria-label={tf("scope")} className="flex flex-col gap-1.5" data-scope-list>
        {options.map((option) => {
          const Icon = ICONS[option.scope];
          const active = value === option.scope;

          return (
            <button
              key={option.scope}
              type="button"
              role="radio"
              aria-checked={active}
              data-scope={option.scope}
              data-scope-locked={option.allowed ? undefined : "true"}
              onClick={() => (option.allowed ? onChange(option.scope) : onLocked(option.scope))}
              className={cn(
                "flex w-full items-center gap-3 rounded-control border px-3 py-2.5 text-left",
                "transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-brand-500",
                active
                  ? "border-brand-500/60 bg-brand-50"
                  : option.allowed
                    ? "border-border bg-surface-2 hover:border-border-strong"
                    : "border-dashed border-border bg-surface-2 hover:border-border-strong",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-[10px]",
                  active ? "bg-brand-500 text-brand-contrast" : "bg-surface text-text-muted",
                )}
              >
                {option.allowed ? <Icon className="size-[18px]" /> : <Lock className="size-4" />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 text-sm font-semibold text-text">
                  {t(`scopes.${option.scope}`)}
                  {!option.allowed ? (
                    <span className="bg-sunset-pro rounded-[6px] px-1.5 py-px text-[10px] font-extrabold uppercase tracking-wide text-pro-contrast">
                      {tp("withPro")}
                    </span>
                  ) : null}
                </span>
                <span className="text-xs text-text-muted">{tf(`scopeDesc_${option.scope}`)}</span>
              </span>
              <span
                aria-hidden
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full border-2",
                  active ? "border-brand-500" : "border-border-strong",
                )}
              >
                {active ? <span className="size-2.5 rounded-full bg-brand-500" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
