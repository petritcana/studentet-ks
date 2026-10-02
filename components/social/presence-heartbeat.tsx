"use client";

import * as React from "react";
import { HEARTBEAT_SECONDS } from "@/lib/presence";

/** Rrahja që e mban gjallë statusin online. */
export function PresenceHeartbeat() {
  React.useEffect(() => {
    let stopped = false;

    function beat() {
      if (stopped || document.visibilityState !== "visible") return;
      void fetch("/api/prania", { method: "POST", keepalive: true }).catch(() => {});
    }

    beat();
    const timer = window.setInterval(beat, HEARTBEAT_SECONDS * 1000);
    document.addEventListener("visibilitychange", beat);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
    };
  }, []);

  return null;
}
