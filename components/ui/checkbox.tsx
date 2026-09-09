"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(function Checkbox({ className, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        "peer size-5 shrink-0 rounded-[6px] border border-border bg-surface",
        "transition-all duration-150 ease-brand",
        "hover:border-brand-500/60",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-brand-500 data-[state=checked]:bg-brand-500",
        "data-[state=indeterminate]:border-brand-500 data-[state=indeterminate]:bg-brand-500",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        {props.checked === "indeterminate" ? (
          <Minus className="size-3.5" strokeWidth={3} />
        ) : (
          <Check className="size-3.5" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});

/** Checkbox me etiketë dhe përshkrim, i klikueshëm në tërë sipërfaqen. */
export function CheckboxRow({
  id,
  label,
  description,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
  id: string;
  label: string;
  description?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface p-3",
        "transition-colors duration-150 ease-brand hover:bg-brand-500/8",
        "has-[button[data-state=checked]]:border-brand-500/50 has-[button[data-state=checked]]:bg-brand-500/5",
        className,
      )}
    >
      <Checkbox id={id} className="mt-0.5" {...props} />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-text">{label}</span>
        {description ? (
          <span className="text-xs text-text-muted">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
