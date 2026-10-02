"use client";

import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Ruajtja si PDF.
 *
 * Nuk instalohet asnjë bibliotekë PDF: shfletuesi e bën vetë, dhe rezultati
 * ndjek stilet e printimit te `globals.css`. Një varësi më pak për një veçori që
 * sistemi operativ e ka të gatshme.
 */
export function PrintButton() {
  const t = useTranslations("cv");

  return (
    <Button size="sm" variant="secondary" onClick={() => window.print()} className="no-print">
      <Printer />
      {t("print")}
    </Button>
  );
}
