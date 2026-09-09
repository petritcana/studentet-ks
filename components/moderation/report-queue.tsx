"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { claimReport, resolveReport } from "@/lib/actions/moderation";
import { REPORT_REASON_LABELS, type ReportReason } from "@/lib/constants";
import { timeAgoShort } from "@/lib/format";

export type QueueItem = {
  id: string;
  targetId: string;
  targetType: string;
  reason: string;
  note: string | null;
  status: string;
  createdAt: string;
  reporter: string;
  content: {
    excerpt: string;
    author: string;
    authorUsername: string | null;
    isHidden: boolean;
    href: string | null;
  } | null;
};

const TYPE_LABELS: Record<string, string> = {
  post: "Postim",
  comment: "Koment",
  material: "Material",
  user: "Përdorues",
  message: "Mesazh",
  answer: "Përgjigje",
};

export function ReportQueue({ items }: { items: QueueItem[] }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <ReportRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function ReportRow({ item }: { item: QueueItem }) {
  const router = useRouter();
  const [note, setNote] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function decide(decision: "remove" | "dismiss" | "restore") {
    startTransition(async () => {
      const result = await resolveReport(item.id, decision, note);
      if (!result.ok) {
        toast.error(result.message ?? "S'u krye dot.");
        return;
      }
      toast.success(result.message ?? "Gati.");
      router.refresh();
    });
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="danger">
          {REPORT_REASON_LABELS[item.reason as ReportReason] ?? item.reason}
        </Badge>
        <Badge>{TYPE_LABELS[item.targetType] ?? item.targetType}</Badge>
        {item.status === "reviewing" ? <Badge variant="brand">Në shqyrtim</Badge> : null}
        {item.content?.isHidden ? (
          <Badge variant="warning">
            <EyeOff />I fshehur
          </Badge>
        ) : null}
        <span className="tabular ml-auto text-xs text-text-muted">
          {timeAgoShort(item.createdAt)}
        </span>
      </div>

      {item.content ? (
        <div className="mt-3 rounded-md border border-border bg-surface-2 p-3">
          <p className="line-clamp-4 text-sm text-text">{item.content.excerpt}</p>
          <p className="mt-2 text-xs text-text-muted">
            Autori:{" "}
            {item.content.authorUsername ? (
              <Link
                href={`/u/${item.content.authorUsername}`}
                className="text-brand-500 hover:underline"
              >
                {item.content.author}
              </Link>
            ) : (
              item.content.author
            )}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-text-muted">
          Përmbajtja nuk u gjet. Ndoshta është fshirë nga vetë autori.
        </p>
      )}

      {item.note ? (
        <p className="mt-2 text-xs text-text-muted">
          Shënim i raportuesit: «{item.note}»
        </p>
      ) : null}

      <p className="mt-1 text-xs text-text-muted">Raportoi: {item.reporter}</p>

      <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center">
        <Input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Arsyeja e vendimit (opsionale)"
          className="sm:max-w-xs"
          aria-label="Arsyeja e vendimit"
        />
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          {item.status === "open" ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await claimReport(item.id);
                  router.refresh();
                })
              }
            >
              <Eye />
              Merre
            </Button>
          ) : null}
          {item.content?.isHidden ? (
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => decide("restore")}>
              <RotateCcw />
              Ktheje
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => decide("dismiss")}>
            <Check />
            Pa masë
          </Button>
          <Button size="sm" variant="danger" disabled={pending} onClick={() => decide("remove")}>
            <EyeOff />
            Hiqe
          </Button>
        </div>
      </div>
    </Card>
  );
}
