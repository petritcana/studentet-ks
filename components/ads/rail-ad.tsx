"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AdCard } from "./ad-card";
import { trackRailAdImpression } from "@/lib/actions/posts";
import type { AdDto } from "@/lib/dto";

/** Faqet ku reklama nuk del kurrë, edhe pse shtylla e majtë është aty. */
const AD_FREE_PREFIXES = ["/mesazhe"];

/**
 * Reklama e shtyllës së majtë.
 *
 * Shtylla renderohet një herë nga layout-i dhe mbetet gjatë navigimit, prandaj
 * vendimi se ku nuk del reklama merret këtu, sipas faqes aktuale. Shfaqja shkruhet
 * vetëm kur karta u pa vërtet.
 */
export function RailAd({ ad }: { ad: AdDto }) {
  const pathname = usePathname();
  const hidden = AD_FREE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const recorded = React.useRef(false);

  React.useEffect(() => {
    if (hidden || recorded.current) return;
    recorded.current = true;
    void trackRailAdImpression(ad.id);
  }, [hidden, ad.id]);

  if (hidden) return null;
  return <AdCard ad={ad} />;
}
