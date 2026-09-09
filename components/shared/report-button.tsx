"use client";

import * as React from "react";
import { Flag } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { ReportDialog } from "./report-dialog";

export function ReportButton({
  targetId,
  targetType,
  variant = "ghost",
  size,
  label = "Raporto",
}: {
  targetId: string;
  targetType: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <Flag />
        {label}
      </Button>
      <ReportDialog
        open={open}
        onOpenChange={setOpen}
        targetId={targetId}
        targetType={targetType}
      />
    </>
  );
}
