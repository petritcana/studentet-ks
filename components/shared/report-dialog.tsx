"use client";

import * as React from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioRow } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { reportContent } from "@/lib/actions/posts";
import { REPORT_REASONS, REPORT_REASON_LABELS, type ReportReason } from "@/lib/constants";

const DESCRIPTIONS: Record<ReportReason, string> = {
  harassment: "Sulm ndaj një personi ose grupi.",
  hate: "Gjuhë urrejtjeje mbi baza etnike, fetare, gjinore ose të tjera.",
  targeting: "Përmend një person me emër në një kanal ku nuk lejohet.",
  sexual: "Përmbajtje seksuale.",
  threat: "Kërcënim ndaj sigurisë së dikujt.",
  spam: "Reklamë, linqe të përsëritura ose tekst i pakuptimtë.",
  personal_data: "Numër telefoni, adresë ose të dhëna të tjera personale.",
  copyright: "Material me të drejta autoriale i ngarkuar pa leje.",
  other: "Diçka tjetër që duhet parë nga një moderator.",
};

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
  const [reason, setReason] = React.useState<string>("spam");
  const [note, setNote] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function submit() {
    startTransition(async () => {
      const result = await reportContent({ targetId, targetType, reason, note });
      if (!result.ok) {
        toast.error(result.message ?? "S'u dërgua dot raporti.");
        return;
      }
      toast.success(result.message ?? "E morëm raportin.");
      onOpenChange(false);
      setNote("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Raporto këtë përmbajtje</DialogTitle>
          <DialogDescription>
            E shikojmë brenda 24 orësh. Tri raportime e fshehin automatikisht deri në rishikim.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          <RadioGroup value={reason} onValueChange={setReason} aria-label="Arsyeja e raportimit">
            {REPORT_REASONS.map((item) => (
              <RadioRow
                key={item}
                value={item}
                id={`report-${item}`}
                label={REPORT_REASON_LABELS[item]}
                description={DESCRIPTIONS[item]}
              />
            ))}
          </RadioGroup>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-note" className="text-sm font-medium text-text">
              Shënim (opsional)
            </label>
            <Textarea
              id="report-note"
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Çfarë duhet të dijë moderatori?"
            />
          </div>

          <p className="flex items-start gap-2 rounded-md border border-border bg-surface-2 p-3 text-xs text-text-muted">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            Raportimi është anonim ndaj personit të raportuar. Keqpërdorimi i raportimeve
            kufizohet.
          </p>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Anulo
          </Button>
          <Button onClick={submit} loading={pending}>
            Dërgo raportin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
