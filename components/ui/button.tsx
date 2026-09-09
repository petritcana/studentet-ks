"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
    "transition-all duration-150 ease-brand select-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98]",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ),
  {
    variants: {
      variant: {
        primary: cn(
          "bg-brand-500 text-brand-contrast shadow-soft",
          "hover:bg-brand-600 hover:shadow-lifted",
        ),
        secondary: cn(
          "bg-surface-2 text-text border border-border",
          "hover:bg-border/60",
        ),
        outline: cn(
          "border border-brand-500/40 text-brand-500 bg-transparent",
          "hover:bg-brand-500/10 hover:border-brand-500",
        ),
        ghost: "text-text-muted hover:bg-surface-2 hover:text-text",
        danger: cn(
          "bg-danger-solid text-white shadow-soft",
          "hover:brightness-110",
        ),
      },
      size: {
        sm: "h-8 rounded-sm px-3 text-xs [&_svg]:size-3.5",
        md: "h-10 rounded-sm px-4 text-sm [&_svg]:size-4",
        lg: "h-12 rounded-md px-6 text-base [&_svg]:size-5",
        icon: "size-10 rounded-sm [&_svg]:size-4",
        pill: "h-10 rounded-full px-5 text-sm [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Zëvendëson përmbajtjen me pika ngarkimi, pa e ndryshuar gjerësinë. */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant, size, asChild = false, loading = false, children, disabled, ...props },
    ref,
  ) {
    // Me asChild, Slot pranon vetëm një fëmijë të vetëm, prandaj gjendja e
    // ngarkimit vlen vetëm për butonin e vërtetë.
    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={cn(buttonVariants({ variant, size }), className)}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <span className="inline-flex items-center gap-1" aria-hidden>
              <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:0ms]" />
              <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
              <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
            </span>
            <span className="sr-only">Duke punuar</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);

export { buttonVariants };
