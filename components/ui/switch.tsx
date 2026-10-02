"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(function Switch({ className, ...props }, ref) {
  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent p-0.5",
        "transition-colors duration-250 ease-brand",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-brand-500 data-[state=unchecked]:bg-border",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-surface-solid shadow-soft ring-0",
          "transition-transform duration-250 ease-brand",
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        )}
      />
    </SwitchPrimitive.Root>
  );
});

/** Rresht cilësimi: titull, përshkrim dhe çelës në të djathtë. */
export function SwitchRow({
  id,
  label,
  description,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & {
  id: string;
  label: string;
  description?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-md border border-border bg-surface p-3",
        className,
      )}
    >
      <label htmlFor={id} className="flex cursor-pointer flex-col gap-0.5">
        <span className="text-sm font-medium text-text">{label}</span>
        {description ? <span className="text-xs text-text-muted">{description}</span> : null}
      </label>
      <Switch id={id} {...props} />
    </div>
  );
}
