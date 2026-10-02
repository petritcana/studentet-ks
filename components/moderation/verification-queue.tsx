"use client";

import { TimeAgo } from "@/components/shared/time-ago";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, IdCard, Mail, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/shared/empty-state";
import { reviewVerification } from "@/lib/actions/verification";

export type PendingVerification = {
  id: string;
  kind: string;
  createdAt: string;
  emailConfirmed: boolean;
  hasDocuments: boolean;
  /** Fotoja e ID-së: e hap vetëm moderimi, dhe fshihet sapo merret vendimi. */
  idDocumentUrl: string | null;
  note: string | null;
  userName: string;
  userUsername: string;
  userEmail: string;
  birthLabel: string | null;
  universityLabel: string | null;
  facultyLabel: string | null;
};

/**
 * Radha e verifikimeve.
 *
 * Moderatori sheh vetëm atë që i duhet për vendimin: emrin, emailin studentor të
 * konfirmuar, datën e lindjes, institucionin dhe foton e ID-së. Fotoja hapet
 * vetëm për moderimin dhe fshihet sapo vendimi merret.
 */
export function VerificationQueue({ items }: { items: PendingVerification[] }) {
  const router = useRouter();
  const t = useTranslations("verify");
  const tc = useTranslations("common");

  const [reasons, setReasons] = React.useState<Record<string, string>>({});
  const [pending, startTransition] = React.useTransition();

  function decide(id: string, decision: "approve" | "reject") {
    startTransition(async () => {
      const result = await reviewVerification(id, decision, reasons[id]);
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      toast.success(decision === "approve" ? t("approved") : t("rejected"));
      router.refresh();
    });
  }

  if (items.length === 0) {
    return <EmptyState illustration="people" title={t("queueEmpty")} />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id}>
          <Card className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="brand">{item.kind}</Badge>
              {item.facultyLabel ? (
                <span className="text-xs text-text-muted">{item.facultyLabel}</span>
              ) : null}
              <span className="tabular ml-auto text-xs text-text-muted">
                <TimeAgo value={item.createdAt} />
              </span>
            </div>

            <Link
              href={`/u/${item.userUsername}`}
              className="text-sm font-semibold text-text hover:text-brand-500"
            >
              {item.userName}
            </Link>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span
                className={
                  item.emailConfirmed
                    ? "inline-flex items-center gap-1 text-success-text"
                    : "inline-flex items-center gap-1 text-text-muted"
                }
              >
                <Mail className="size-3.5" />
                {t("reviewEmail")}
                {item.emailConfirmed ? <Check className="size-3" /> : null}
              </span>
              <span
                className={
                  item.hasDocuments
                    ? "inline-flex items-center gap-1 text-success-text"
                    : "inline-flex items-center gap-1 text-text-muted"
                }
              >
                <IdCard className="size-3.5" />
                {t("reviewDocs")}
                {item.hasDocuments ? <Check className="size-3" /> : null}
              </span>
            </div>

            {item.universityLabel || item.birthLabel ? (
              <p className="text-xs text-text-muted">
                {[item.universityLabel, item.birthLabel ? t("reviewBorn", { date: item.birthLabel }) : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
            <p className="break-all text-xs text-text">{item.userEmail}</p>

            {item.idDocumentUrl ? (
              <a
                href={item.idDocumentUrl}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-control border border-border bg-surface-2"
                data-review-id-photo
              >
                {/* Adresë e jona me sesion: `<img>` i thjeshtë, si te `MediaImage`. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.idDocumentUrl}
                  alt={t("reviewIdAlt", { name: item.userName })}
                  className="max-h-80 w-full object-contain"
                />
              </a>
            ) : null}

            {item.note ? (
              <p className="measure rounded-md bg-surface-2 p-2.5 text-xs text-text">{item.note}</p>
            ) : null}

            <Input
              value={reasons[item.id] ?? ""}
              maxLength={200}
              placeholder={t("rejectReason")}
              aria-label={t("rejectReason")}
              onChange={(event) =>
                setReasons((current) => ({ ...current, [item.id]: event.target.value }))
              }
            />

            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Button
                size="sm"
                loading={pending}
                disabled={!item.emailConfirmed || !item.hasDocuments}
                onClick={() => decide(item.id, "approve")}
              >
                <Check />
                {t("approve")}
              </Button>
              <Button size="sm" variant="danger" onClick={() => decide(item.id, "reject")}>
                <X />
                {t("reject")}
              </Button>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
