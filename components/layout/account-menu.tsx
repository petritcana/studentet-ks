"use client";

import { THEME_OPTIONS } from "@/components/shared/theme-toggle";
import { switchTheme } from "@/lib/theme-switch";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, LogOut, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatNumber } from "@/lib/format";
import { signOutAction } from "@/lib/actions/auth";
import { accountMenuFor, PRIMARY_NAV } from "./nav-items";

/**
 * Menyja e avatarit.
 *
 * Këtu, dhe vetëm këtu, jetojnë Moderimi dhe Admini. Filtrimi bëhet me
 * `accountMenuFor(role)`, dhe rrugët mbrohen veçmas në server: fshehja e një
 * lidhjeje nuk është kurrë kontroll qasjeje.
 */
export function AccountMenu({
  name,
  username,
  avatar,
  role,
  xp,
}: {
  name: string;
  username: string;
  avatar: string | null;
  role: string;
  /** XP jeton këtu dhe te profili, jo si chip i vecante ne shirit. */
  xp: number;
}) {
  const locale = useLocale();
  const t = useTranslations("nav");
  const tt = useTranslations("theme");
  const { resolvedTheme, setTheme } = useTheme();
  const items = accountMenuFor(role);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("openAccount")}
          className="flex shrink-0 items-center gap-1 rounded-full p-0.5 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          <Avatar name={name} src={avatar} size="sm" className="ring-2 ring-bg shadow-[0_0_0_4px_var(--primary)] lg:size-10" />
          <ChevronDown className="size-3.5 text-text-muted" aria-hidden />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-text">{name}</span>
            <span className="truncate text-xs font-normal text-text-muted">@{username}</span>
          </span>
        </DropdownMenuLabel>

        <DropdownMenuItem asChild>
          <Link href="/une/xp">
            <Sparkles className="text-brand-500" />
            <span className="flex-1">{t("xp")}</span>
            <span className="tabular text-xs text-text-muted">{formatNumber(xp, locale)}</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Në celular shtylla e majtë nuk shihet: zërat që nuk janë te navigimi i poshtëm dalin këtu. */}
        {PRIMARY_NAV.filter((item) => item.href !== "/feed" && item.href !== "/komuniteti").map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.href} asChild className="lg:hidden">
              <Link href={item.href}>
                <Icon />
                {t(item.key)}
              </Link>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator className="lg:hidden" />

        {items.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href}>
                <Icon />
                {t(item.key)}
              </Link>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-text-muted">
          {t("theme")}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={resolvedTheme ?? "blue"} onValueChange={(value) => switchTheme(setTheme, value)}>
          {THEME_OPTIONS.map(({ value, key, Icon }) => (
            <DropdownMenuRadioItem key={value} value={value} data-color-mode={value}>
              <Icon />
              {tt(key)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          onSelect={() => {
            void signOutAction();
          }}
        >
          <LogOut />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
