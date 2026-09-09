"use client";

import * as React from "react";

/** Regjistron service worker-in vetëm në prodhim, që zhvillimi të mos ruajë cache. */
export function ServiceWorkerRegistrar() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Shfletuesit që e bllokojnë regjistrimin nuk janë gabim për ne.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
