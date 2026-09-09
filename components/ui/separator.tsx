"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/lib/utils";

export const Separator = React.forwardRef<
  React.ComponentRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> & { label?: string }
>(function Separator(
  { className, orientation = "horizontal", decorative = true, label, ...props },
  ref,
) {
  if (label) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <SeparatorPrimitive.Root
          ref={ref}
          decorative
          orientation="horizontal"
          className="h-px flex-1 bg-border"
        />
        <span className="text-xs text-text-muted">{label}</span>
        <SeparatorPrimitive.Root
          decorative
          orientation="horizontal"
          className="h-px flex-1 bg-border"
        />
      </div>
    );
  }

  return (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
});
