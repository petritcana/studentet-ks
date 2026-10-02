import * as React from "react";
import { cn } from "@/lib/utils";

export function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border pt-10 first:border-0 first:pt-0">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-serif text-2xl text-text">{title}</h2>
        {intro ? <p className="measure text-sm text-text-muted">{intro}</p> : null}
      </div>
      <div className="mt-6 flex flex-col gap-6">{children}</div>
    </section>
  );
}

export function Demo({
  label,
  note,
  children,
  className,
  bare = false,
}: {
  label: string;
  note?: string;
  children: React.ReactNode;
  className?: string;
  bare?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-text">{label}</h3>
        {note ? <p className="text-xs text-text-muted">{note}</p> : null}
      </div>
      <div className={cn(!bare && "rounded-lg border border-border bg-surface p-4 sm:p-5", className)}>
        {children}
      </div>
    </div>
  );
}

export function Row({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-wrap items-center gap-3", className)} {...props} />;
}

export function Meta({ children }: { children: React.ReactNode }) {
  return <span className="tabular text-xs text-text-muted">{children}</span>;
}
