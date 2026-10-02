"use client";

import * as React from "react";

/**
 * Shënon cilat postime u panë vërtet.
 *
 * Pamja numërohet kur karta hyn në ekran, jo kur faqja dërgohet: ndryshe
 * analitika do të numëronte çdo postim që studenti nuk e pa kurrë sepse nuk
 * zbriti deri aty. Id-të grumbullohen dhe nisen bashkë, që të mos bëhet një
 * kërkesë për çdo kartë.
 *
 * Serveri e mban një rresht për person, prandaj një rifreskim nuk e rrit numrin.
 */
export function ViewTracker({ ids }: { ids: string[] }) {
  const sent = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    const fresh = ids.filter((id) => !sent.current.has(id));
    if (fresh.length === 0) return;

    const seen = new Set<string>();
    let timer: number | undefined;

    function flush() {
      const batch = [...seen];
      if (batch.length === 0) return;
      seen.clear();
      for (const id of batch) sent.current.add(id);

      void fetch("/api/pamje", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: batch }),
        keepalive: true,
      }).catch(() => {
        // Një pamje e humbur nuk ia vlen të provohet sërish: numri është matje,
        // jo veprim i studentit, dhe një rikthim i dështuar nuk duhet ta ngarkojë.
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).dataset.postId;
          if (!id || sent.current.has(id)) continue;
          seen.add(id);
          observer.unobserve(entry.target);
        }

        window.clearTimeout(timer);
        timer = window.setTimeout(flush, 1200);
      },
      { threshold: 0.5 },
    );

    for (const id of fresh) {
      const node = document.querySelector(`[data-post-id="${id}"]`);
      if (node) observer.observe(node);
    }

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      flush();
    };
  }, [ids]);

  return null;
}
