"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      // Tri tema: «Sistemi» është blu e platformës dhe parazgjedhja, «E errët» e
      // zezë, «E çelët» e bardhë. Nuk ndjekin sistemin e pajisjes.
      themes={["blue", "dark", "light"]}
      defaultTheme="blue"
      enableSystem={false}
      // Çelës i ri: kush kishte zgjedhur «dark» e kishte blunë, dhe e mban atë.
      storageKey="sks-theme"
      // Ndërrimi i temës është i menjëhershëm: asnjë tranzicion ngjyre në atë çast.
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={250} skipDelayDuration={400}>
        {children}
      </TooltipProvider>
    </ThemeProvider>
  );
}
