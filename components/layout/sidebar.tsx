"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Briefcase, Flame, MessageSquare, Settings, Shield } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand";
import { PRIMARY_NAV, isActive } from "@/components/layout/nav-items";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const SECONDARY_NAV = [
  { href: "/mesazhe", key: "messages", icon: MessageSquare },
  { href: "/pune", key: "jobs", icon: Briefcase },
  { href: "/cilesimet", key: "settings", icon: Settings },
];

export function Sidebar({
  level,
  className,
  isModerator,
  unreadMessages,
}: {
  level: { name: string; percent: number; next: string | null; toNext: number };
  className?: string;
  isModerator: boolean;
  unreadMessages: number;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <aside className={cn("flex w-64 shrink-0 flex-col gap-6", className)}>
      <BrandLogo />

      <nav aria-label="Navigimi kryesor">
        <ul className="flex flex-col gap-1">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
                    "transition-colors duration-150 ease-brand",
                    active
                      ? "bg-brand-500/12 text-brand-500"
                      : "text-text-muted hover:bg-surface hover:text-text",
                  )}
                >
                  <item.icon className="size-5 shrink-0" />
                  {t(item.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="h-px bg-border" />

      <nav aria-label="Navigimi dytësor">
        <ul className="flex flex-col gap-1">
          {SECONDARY_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                    "transition-colors duration-150 ease-brand",
                    active
                      ? "bg-brand-500/12 font-medium text-brand-500"
                      : "text-text-muted hover:bg-surface hover:text-text",
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="flex-1">{t(item.key)}</span>
                  {item.href === "/mesazhe" && unreadMessages > 0 ? (
                    <span className="tabular rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-brand-contrast">
                      {unreadMessages}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}

          {isModerator ? (
            <li>
              <Link
                href="/moderimi"
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                  "transition-colors duration-150 ease-brand",
                  pathname.startsWith("/moderimi")
                    ? "bg-brand-500/12 font-medium text-brand-500"
                    : "text-text-muted hover:bg-surface hover:text-text",
                )}
              >
                <Shield className="size-4 shrink-0" />
                {t("moderation")}
              </Link>
            </li>
          ) : null}
        </ul>
      </nav>

      <div className="mt-auto rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center gap-2">
          <Flame className="size-4 text-accent-500" />
          <p className="text-sm font-medium text-text">{level.name}</p>
        </div>
        <Progress value={level.percent} size="sm" className="mt-3" />
        <p className="mt-2 text-xs text-text-muted">
          {level.next
            ? `Edhe ${level.toNext} XP deri te ${level.next}.`
            : "Je në nivelin më të lartë."}
        </p>
      </div>
    </aside>
  );
}
