"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { reportContent } from "@/lib/actions/posts";
import { REPORT_REASONS } from "@/lib/types";

/**
 * Raportimi, i njëjtë për postime, komente, materiale dhe mesazhe.
 *
 * Nuk e ndëshkon kurrë raportuesin dhe nuk e ekspozon publikisht autorin: teksti
 * flet për shqyrtim, jo për dënim.
 */
export function ReportDialog({
  open,
  onOpenChange,
  targetId,
  targetType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string;
  targetType: string;
}) {
  const t = useTranslations("feed");
  const tr = useTranslations("reportReason");
  const tc = useTranslations("common");
  const [reason, setReason] = React.useState<string>(REPORT_REASONS[0]);
  const [note, setNote] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function send() {
    startTransition(async () => {
      const result = await reportContent({ targetId, targetType, reason, note });
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      toast.success(result.messageKey === "feed.reportedHidden" ? t("reportedHidden") : t("reported"));
      onOpenChange(false);
      setNote("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("reportTitle")}</DialogTitle>
          <DialogDescription>{t("reportBody")}</DialogDescription>
        </DialogHeader>

        <RadioGroup value={reason} onValueChange={setReason} className="gap-1">
          {REPORT_REASONS.map((item) => (
            <label
              key={item}
              htmlFor={`reason-${item}`}
              className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm text-text transition-colors hover:bg-surface-2"
            >
              <RadioGroupItem id={`reason-${item}`} value={item} />
              {tr(item)}
            </label>
          ))}
        </RadioGroup>

        <Textarea
          value={note}
          maxLength={500}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t("reportNote")}
          aria-label={t("reportNote")}
          className="min-h-20"
        />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={send} loading={pending}>
            {t("reportSend")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
