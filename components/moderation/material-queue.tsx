"use client";

import { TimeAgo } from "@/components/shared/time-ago";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/shared/empty-state";
import { verifyMaterial } from "@/lib/actions/moderation";
import { formatBytes } from "@/lib/format";

export type PendingMaterial = {
  id: string;
  title: string;
  type: string;
  size: number;
  pages: number | null;
  createdAt: string;
  courseName: string;
  uploaderName: string;
  uploaderUsername: string;
};

/**
 * Radha e verifikimit.
 *
 * Miratimi këtu është i vetmi vend që lëshon 50 XP kontributi dhe shtatë ditë
 * Pro. Refuzimi i heq të dyja, me arsyen e regjistruar.
 */
export function MaterialQueue({ materials }: { materials: PendingMaterial[] }) {
  const router = useRouter();
  const t = useTranslations("moderation");
  const tm = useTranslations("material");
  const tmt = useTranslations("materialType");
  const tc = useTranslations("common");

  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [pending, startTransition] = React.useTransition();

  function decide(id: string, decision: "verify" | "reject") {
    startTransition(async () => {
      const result = await verifyMaterial(id, decision, notes[id]);
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      toast.success(decision === "verify" ? tm("nowVerified") : tc("saved"));
      router.refresh();
    });
  }

  if (materials.length === 0) {
    return <EmptyState illustration="materials" title={t("queueEmpty")} />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {materials.map((material) => (
        <li key={material.id}>
          <Card className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="brand">{tmt(material.type)}</Badge>
              <span className="tabular text-xs text-text-muted">{material.courseName}</span>
              <span className="tabular ml-auto text-xs text-text-muted">
                <TimeAgo value={material.createdAt} />
              </span>
            </div>

            <Link
              href={`/materialet/${material.id}`}
              className="text-sm font-semibold text-text hover:text-brand-500"
            >
              {material.title}
            </Link>

            <p className="tabular flex flex-wrap items-center gap-x-3 text-xs text-text-muted">
              <span>{formatBytes(material.size)}</span>
              {material.pages ? <span>· {material.pages}</span> : null}
              <Link href={`/u/${material.uploaderUsername}`} className="hover:text-text">
                · {material.uploaderName}
              </Link>
            </p>

            <Input
              value={notes[material.id] ?? ""}
              maxLength={200}
              placeholder={t("note")}
              aria-label={t("note")}
              onChange={(event) =>
                setNotes((current) => ({ ...current, [material.id]: event.target.value }))
              }
            />

            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Button size="sm" loading={pending} onClick={() => decide(material.id, "verify")}>
                <Check />
                {tm("nowVerified")}
              </Button>
              <Button size="sm" variant="danger" onClick={() => decide(material.id, "reject")}>
                <X />
                {t("remove")}
              </Button>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
