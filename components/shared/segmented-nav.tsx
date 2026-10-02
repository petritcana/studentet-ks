import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Navigimi me segmente, i ndërtuar mbi lidhje.
 *
 * Tabs-at që ndryshojnë të dhëna serveri janë rrugë, jo gjendje klienti: kështu
 * ndarja e lidhjes hap të njëjtën pamje dhe butoni «prapa» funksionon.
 */
export function SegmentedNav({
  base,
  active,
  items,
  label,
  className,
}: {
  base: string;
  active: string;
  items: { value: string; label: string; count?: number }[];
  label?: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        "-mx-4 flex gap-1 overflow-x-auto scrollbar-none px-4 sm:mx-0 sm:px-0",
        className,
      )}
    >
      {items.map((item, index) => {
        const isActive = item.value === active;
        const href = index === 0 ? base : `${base}?tab=${item.value}`;

        return (
          <Link
            key={item.value}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium",
              "transition-all duration-150 ease-brand",
              isActive
                ? "border-brand-500 bg-brand-500/12 text-brand-500"
                : "border-border bg-surface text-text-muted hover:text-text",
            )}
          >
            {item.label}
            {typeof item.count === "number" && item.count > 0 ? (
              <span className="tabular ml-1.5 text-xs opacity-70">{item.count}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
