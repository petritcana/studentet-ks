"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Shiriti i hollë i përparimit në krye.
 *
 * App Router-i nuk jep ngjarje navigimi, prandaj kapet klikimi mbi çdo lidhje
 * të brendshme dhe shiriti mbyllet kur adresa ndryshon vërtet. Pa këtë, një
 * klikim te një faqe e ngadaltë duket si klikim i humbur, dhe studenti e shtyp
 * prapë butonin.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [active, setActive] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      setActive(true);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // Adresa ndryshoi: faqja e re është këtu, shiriti mbaron.
  React.useEffect(() => {
    setActive(false);
    if (timer.current) clearTimeout(timer.current);
  }, [pathname, search]);

  // Rrjeti mund të dështojë pa ndryshuar adresën; shiriti nuk mbetet përgjithmonë.
  React.useEffect(() => {
    if (!active) return;
    timer.current = setTimeout(() => setActive(false), 12_000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden" role="status" aria-hidden>
      <div className="h-full w-full origin-left animate-nav-progress bg-brand-500" />
    </div>
  );
}
