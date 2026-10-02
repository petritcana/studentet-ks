import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium [&_svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "border-border bg-surface-2 text-text-muted",
        brand: "border-brand-500/25 bg-brand-500/10 text-brand-500",
        accent: "border-accent-500/25 bg-accent-500/10 text-accent-text",
        success: "border-success/25 bg-success/10 text-success-text",
        warning: "border-warning/25 bg-warning/10 text-warning-text",
        danger: "border-danger/25 bg-danger/10 text-danger-text",
        solid: "border-transparent bg-brand-500 text-brand-contrast",
        /** Ngjyra vjen nga --faculty-* te stili inline i prindit. */
        faculty: "border-faculty/30 bg-faculty/10 text-faculty-text",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
