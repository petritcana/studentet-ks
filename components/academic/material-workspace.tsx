"use client";

import * as React from "react";
import { DocumentViewer, type DocumentPage } from "./document-viewer";
import { StudyHelper } from "./study-helper";
import { explainParagraph } from "@/lib/actions/ai";
import type { AiResult } from "@/lib/ai";
import { toast } from "@/components/ui/toast";

/** Lidh shikuesin me ndihmësin: nënvizo një paragraf, merr shpjegimin poshtë. */
export function MaterialWorkspace({
  materialId,
  title,
  pages,
}: {
  materialId: string;
  title: string;
  pages: DocumentPage[];
}) {
  const [explanation, setExplanation] = React.useState<AiResult<string> | null>(null);
  const [, startTransition] = React.useTransition();

  function explain(paragraph: string) {
    startTransition(async () => {
      const result = await explainParagraph(materialId, paragraph);
      if (!result) {
        toast.error("S'u ndërtua dot shpjegimi.");
        return;
      }
      setExplanation(result);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <DocumentViewer
        materialId={materialId}
        title={title}
        pages={pages}
        onExplain={explain}
      />
      <StudyHelper
        materialId={materialId}
        explanation={explanation}
        onClearExplanation={() => setExplanation(null)}
      />
    </div>
  );
}
