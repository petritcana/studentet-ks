"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { useTranslations } from "next-intl";
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
        /** Veprimi kryesor (Posto, Krijo). Në errësirë është limoni, e vetmja ngjyrë e tij e madhe. */
        primary:
          "bg-primary bg-primary-grad font-semibold text-on-primary shadow-cta hover:-translate-y-px hover:brightness-110",
        secondary: "border border-border bg-surface-2 text-text hover:border-border-strong hover:bg-border/60",
        outline:
          "border border-border-strong bg-transparent text-text hover:-translate-y-px hover:border-brand-500/60 hover:bg-surface-2",
        ghost: "text-text-muted hover:bg-surface-2 hover:text-text",
        danger: "bg-danger-solid text-white shadow-soft hover:brightness-110",
        /** Vetëm për veprimet e Pro-s. Kurrë për veprime të zakonshme. */
        pro: "pro-gradient font-semibold text-pro-contrast shadow-soft hover:-translate-y-px hover:brightness-105 hover:shadow-lifted",
      },
      size: {
        sm: "h-8 rounded-[10px] px-3 text-xs [&_svg]:size-3.5",
        md: "h-10 rounded-control px-4 text-sm [&_svg]:size-4",
        lg: "h-[52px] rounded-control px-6 text-base font-bold [&_svg]:size-5",
        icon: "size-10 rounded-control [&_svg]:size-4",
        iconSm: "size-8 rounded-[10px] [&_svg]:size-3.5",
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
  /** Zëvendëson përmbajtjen me pika ngarkimi. Kurrë spinner. */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, loading = false, children, disabled, ...props },
  ref,
) {
  const t = useTranslations("common");

  // Me asChild, Slot pranon vetëm një fëmijë, prandaj gjendja e ngarkimit vlen
  // vetëm për butonin e vërtetë.
  if (asChild) {
    return (
      <Slot ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props}>
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
          <span className="sr-only">{t("loading")}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});

export { buttonVariants };
