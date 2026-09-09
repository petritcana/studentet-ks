"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card className="flex flex-col items-start gap-3 p-5">
      <h1 className="font-serif text-xl text-text">Diçka nuk shkoi këtu</h1>
      <p className="measure text-sm text-text-muted">
        Provo ta ngarkosh sërish. Nëse përsëritet, kthehu pas pak minutash.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-text-muted">Kodi: {error.digest}</p>
      ) : null}
      <Button onClick={reset}>
        <RotateCcw />
        Provo prapë
      </Button>
    </Card>
  );
}
