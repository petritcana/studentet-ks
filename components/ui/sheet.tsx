"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DialogOverlay } from "./dialog";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const sheetVariants = cva(
  cn(
    "fixed z-50 flex flex-col gap-0 border-border bg-surface shadow-lifted",
    "focus:outline-none",
  ),
  {
    variants: {
      side: {
        bottom:
          "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-xl border-t data-[state=open]:animate-slide-up",
        left: "inset-y-0 left-0 h-full w-[min(88vw,20rem)] border-r data-[state=open]:animate-slide-right",
        right:
          "inset-y-0 right-0 h-full w-[min(88vw,24rem)] border-l data-[state=open]:animate-slide-left",
        top: "inset-x-0 top-0 max-h-[85dvh] rounded-b-xl border-b data-[state=open]:animate-slide-down",
      },
    },
    defaultVariants: { side: "bottom" },
  },
);

export const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> &
    VariantProps<typeof sheetVariants> & { hideClose?: boolean }
>(function SheetContent({ className, children, side = "bottom", hideClose, ...props }, ref) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {side === "bottom" ? (
          <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border" aria-hidden />
        ) : null}
        {children}
        {hideClose ? null : (
          <DialogPrimitive.Close
            className={cn(
              "absolute right-4 top-4 rounded-full p-1.5 text-text-muted",
              "transition-colors duration-150 hover:bg-surface-2 hover:text-text",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
            )}
          >
            <X className="size-4" />
            <span className="sr-only">Mbylle</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-5 pr-14", className)} {...props} />;
}

export function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex-1 overflow-y-auto scrollbar-thin px-5 pb-5", className)} {...props} />
  );
}

export const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function SheetTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn("text-lg font-semibold text-text", className)}
      {...props}
    />
  );
});

export const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function SheetDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn("text-sm text-text-muted", className)}
      {...props}
    />
  );
});
