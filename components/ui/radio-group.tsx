"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "@/lib/utils";

export const RadioGroup = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(function RadioGroup({ className, ...props }, ref) {
  return <RadioGroupPrimitive.Root ref={ref} className={cn("grid gap-2", className)} {...props} />;
});

export const RadioGroupItem = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(function RadioGroupItem({ className, ...props }, ref) {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "size-5 shrink-0 rounded-full border border-border bg-surface",
        "transition-all duration-150 ease-brand",
        "hover:border-brand-500/60",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-brand-500",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex size-full items-center justify-center">
        <span className="size-2.5 rounded-full bg-brand-500" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});

export function RadioRow({
  value,
  id,
  label,
  description,
  className,
}: {
  value: string;
  id: string;
  label: string;
  description?: string;
  className?: string;
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
      <RadioGroupItem value={value} id={id} className="mt-0.5" />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-text">{label}</span>
        {description ? <span className="text-xs text-text-muted">{description}</span> : null}
      </span>
    </label>
  );
}
