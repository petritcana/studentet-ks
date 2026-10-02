"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { demoSignIn, signOutAction } from "@/lib/actions/auth";
import { setDemoProOverride } from "@/lib/actions/demo";
import { cn } from "@/lib/utils";

export type DemoAccount = { id: string; name: string; labelKey: string };

/**
 * Shiriti i demonstrimit.
 *
 * Shfaqet vetëm kur je i kyçur si llogari demo dhe kurrë në prodhim. Çelësi
 * «Shfaq si» e ndërron pamjen falas/Pro pa ndërruar llogari, që të dyja gjendjet
 * e së njëjtës faqe të krahasohen brenda sekondash.
 */
export function DemoBar({
  currentName,
  accounts,
  proOverride,
  isProNow,
}: {
  currentName: string;
  accounts: DemoAccount[];
  proOverride: "free" | "pro" | null;
  isProNow: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("demo");
  const [pending, startTransition] = React.useTransition();

  function setOverride(value: "free" | "pro" | null) {
    startTransition(async () => {
      await setDemoProOverride(value);
      router.refresh();
    });
  }

  return (
    <div
      role="region"
      aria-label={t("barLabel")}
      className="relative z-50 flex min-h-[38px] flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-banner px-4 py-1.5 text-xs font-semibold text-banner-ink sm:px-6 sm:text-[13px] lg:px-8"
    >
      <span className="truncate">
        {t.rich("viewing", { name: () => <span className="text-banner-name">{currentName}</span> })}
      </span>

      <div
        role="radiogroup"
        aria-label={t("showAs")}
        className="ml-auto inline-flex items-center gap-0.5 rounded-full border border-white/15 bg-white/5 p-[3px]"
      >
        {(
          [
            { value: "free" as const, label: t("asFree"), active: proOverride === "free" || (!proOverride && !isProNow) },
            { value: "pro" as const, label: t("asPro"), active: proOverride === "pro" || (!proOverride && isProNow) },
          ]
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.active}
            disabled={pending}
            onClick={() => setOverride(option.value)}
            className={cn(
              "rounded-full px-3 py-0.5 font-medium transition-colors duration-150",
              option.active
                ? option.value === "pro"
                  ? "bg-sunset-pro font-bold text-pro-contrast"
                  : "bg-white/15 font-bold text-banner-ink"
                : "text-banner-ink/70 hover:text-banner-ink",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1 font-medium text-banner-ink transition-colors hover:border-white/30"
          >
            <Users className="size-3.5" />
            {t("switch")}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t("switch")}</DropdownMenuLabel>
          {accounts.map((account) => (
            <DropdownMenuItem
              key={account.id}
              onSelect={() => {
                void demoSignIn(account.id);
              }}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{account.name}</span>
                <span className="truncate text-xs text-text-muted">{t(account.labelKey)}</span>
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            destructive
            onSelect={() => {
              void signOutAction();
            }}
          >
            <LogOut />
            {t("exit")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
