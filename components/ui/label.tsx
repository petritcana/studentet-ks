"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { hint?: string }
>(function Label({ className, children, hint, ...props }, ref) {
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        "flex items-baseline gap-2 text-sm font-medium text-text",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      {hint ? <span className="text-xs font-normal text-text-muted">{hint}</span> : null}
    </LabelPrimitive.Root>
  );
});

/** Fushë e plotë: etiketë, kontroll, ndihmë ose gabim. */
export function Field({
  label,
  hint,
  error,
  help,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  help?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor} hint={hint}>
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-danger-text">{error}</p>
      ) : help ? (
        <p className="text-xs text-text-muted">{help}</p>
      ) : null}
    </div>
  );
}
