"use client";

import * as React from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

/** Mekanizmi (f): ftesa virale. Të dy fitojnë dhe lidhen si shokë. */
export function InviteCard({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);
  const [origin, setOrigin] = React.useState("");

  React.useEffect(() => setOrigin(window.location.origin), []);
  const link = `${origin}/ftesa/${code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Linku u kopjua.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("S'u kopjua dot. Zgjidhe me dorë dhe kopjoje.");
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Studentët.KS",
          text: "Hyr këtu, e ke orarin dhe materialet e lëndëve në një vend.",
          url: link,
        });
        return;
      } catch {
        // Ndarja e anuluar nuk është gabim.
      }
    }
    void copy();
  }

  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-text">Fto një shok</h2>
      <p className="mt-1 text-sm text-text-muted">
        Kur dikush regjistrohet me linkun tënd, bëheni shokë automatikisht dhe të dy merrni XP.
        Dhjetë ftesa të japin badge-in Ambasador.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <code className="min-w-0 flex-1 truncate rounded-sm border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-text">
          {link || `/ftesa/${code}`}
        </code>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? <Check /> : <Copy />}
            {copied ? "U kopjua" : "Kopjo"}
          </Button>
          <Button size="sm" onClick={share}>
            <Share2 />
            Ndaje
          </Button>
        </div>
      </div>
    </Card>
  );
}
