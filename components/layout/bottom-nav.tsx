"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { PRIMARY_NAV, isActive } from "@/components/layout/nav-items";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * Navigimi i telefonit: 64px lartësi, katër tabs dhe FAB i ngritur në qendër.
 * FAB-i hap kompozuesin, nuk shkon në faqe tjetër.
 */
export function BottomNav({
  user,
  onCompose,
}: {
  user: { name: string; avatar: string | null };
  onCompose: () => void;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [left, right] = [PRIMARY_NAV.slice(0, 2), PRIMARY_NAV.slice(2)];

  return (
    <nav
      aria-label="Navigimi kryesor"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 h-16 border-t border-border bg-bg/95 backdrop-blur-md lg:hidden",
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center px-1">
        {left.map((item) => (
          <NavTab key={item.href} item={item} label={t(item.key)} active={isActive(pathname, item)} />
        ))}

        <li className="flex justify-center">
          <button
            type="button"
            onClick={onCompose}
            aria-label={t("compose")}
            className={cn(
              "-mt-6 grid size-14 place-items-center rounded-full bg-brand-500 text-brand-contrast",
              "shadow-lifted transition-transform duration-150 ease-brand active:scale-95",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
            )}
          >
            <Plus className="size-6" />
          </button>
        </li>

        {right.map((item) =>
          item.href === "/une" ? (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(pathname, item) ? "page" : undefined}
                className="flex flex-col items-center gap-1 py-2"
              >
                <Avatar
                  name={user.name}
                  src={user.avatar}
                  size="xs"
                  ring={isActive(pathname, item)}
                />
                <span
                  className={cn(
                    "text-[10px]",
                    isActive(pathname, item) ? "font-medium text-brand-500" : "text-text-muted",
                  )}
                >
                  {t(item.key)}
                </span>
              </Link>
            </li>
          ) : (
            <NavTab key={item.href} item={item} label={t(item.key)} active={isActive(pathname, item)} />
          ),
        )}
      </ul>
    </nav>
  );
}

function NavTab({
  item,
  label,
  active,
}: {
  item: (typeof PRIMARY_NAV)[number];
  label: string;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className="flex flex-col items-center gap-1 py-2"
      >
        <item.icon
          className={cn("size-5", active ? "text-brand-500" : "text-text-muted")}
        />
        <span
          className={cn(
            "text-[10px]",
            active ? "font-medium text-brand-500" : "text-text-muted",
          )}
        >
          {label}
        </span>
      </Link>
    </li>
  );
}
