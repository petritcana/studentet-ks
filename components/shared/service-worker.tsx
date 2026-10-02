"use client";

import * as React from "react";

/**
 * Regjistrimi i sherbetorit te punes.
 *
 * Vetëm në prodhim: në zhvillim një cache i ngecur i fsheh ndryshimet dhe të
 * bën të kërkosh gabime që nuk ekzistojnë.
 */
export function ServiceWorker() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Regjistrimi i dështuar nuk e prish faqen: aplikacioni punon pa të.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
