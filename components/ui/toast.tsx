"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";

/**
 * Njoftime të shkurtra. Toni: thuaj çfarë ndodhi, jo «operacioni u krye».
 * Gabimet gjithmonë ofrojnë hapin tjetër.
 */
export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme === "light" ? "light" : "dark"}
      position="top-center"
      offset={16}
      duration={4000}
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-md !border !border-border !bg-surface-solid !text-text !shadow-lifted !font-sans",
          title: "!text-sm !font-medium",
          description: "!text-xs !text-text-muted",
          actionButton: "!rounded-sm !bg-brand-500 !text-brand-contrast !text-xs",
          cancelButton: "!rounded-sm !bg-surface-2 !text-text-muted !text-xs",
          success: "[&_[data-icon]]:!text-success-text",
          error: "[&_[data-icon]]:!text-danger-text",
          warning: "[&_[data-icon]]:!text-warning-text",
        },
      }}
    />
  );
}

export const toast = sonnerToast;
