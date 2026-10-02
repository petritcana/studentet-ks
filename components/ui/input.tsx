"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Ikonë dekorative brenda fushës, majtas. */
  icon?: React.ReactNode;
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, icon, invalid, type = "text", ...props },
  ref,
) {
  const field = (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-10 w-full rounded-control border border-border bg-surface-2 px-3 text-sm text-text",
        "placeholder:text-text-muted",
        "transition-colors duration-150 ease-brand",
        "hover:border-text-muted/50",
        "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-danger aria-invalid:focus:ring-danger/25",
        icon && "pl-9",
        className,
      )}
      {...props}
    />
  );

  if (!icon) return field;

  return (
    <div className="relative w-full">
      <span
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted [&_svg]:size-4"
        aria-hidden
      >
        {icon}
      </span>
      {field}
    </div>
  );
});
