"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    variant?: "pill" | "underline";
  }
>(function TabsList({ className, variant = "pill", ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      data-variant={variant}
      className={cn(
        "flex items-center gap-1 overflow-x-auto scrollbar-thin",
        variant === "pill" && "rounded-full border border-border bg-bg p-1",
        variant === "underline" && "border-b border-border",
        className,
      )}
      {...props}
    />
  );
});

export const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(function TabsTrigger({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap text-sm font-medium",
        "transition-all duration-150 ease-brand",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        "disabled:pointer-events-none disabled:opacity-50",
        "text-text-muted hover:text-text",
        // pill
        "[[data-variant=pill]_&]:h-9 [[data-variant=pill]_&]:rounded-full [[data-variant=pill]_&]:px-4",
        "[[data-variant=pill]_&][data-state=active]:bg-surface [[data-variant=pill]_&][data-state=active]:text-text [[data-variant=pill]_&][data-state=active]:shadow-soft",
        // underline
        "[[data-variant=underline]_&]:h-11 [[data-variant=underline]_&]:px-4",
        "[[data-variant=underline]_&][data-state=active]:text-brand-500",
        "[[data-variant=underline]_&][data-state=active]:after:absolute [[data-variant=underline]_&][data-state=active]:after:inset-x-3 [[data-variant=underline]_&][data-state=active]:after:-bottom-px [[data-variant=underline]_&][data-state=active]:after:h-0.5 [[data-variant=underline]_&][data-state=active]:after:rounded-full [[data-variant=underline]_&][data-state=active]:after:bg-brand-500",
        className,
      )}
      {...props}
    />
  );
});

export const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        "mt-4 focus-visible:outline-none",
        "data-[state=active]:animate-rise",
        className,
      )}
      {...props}
    />
  );
});
