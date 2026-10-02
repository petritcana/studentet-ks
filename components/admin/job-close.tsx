"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { removeJob } from "@/lib/actions/admin-jobs";

/** Mbyll një shpallje para afatit. Aplikimet e dërguara mbeten te studenti. */
export function JobClose({ id }: { id: string }) {
  const router = useRouter();
  const t = useTranslations("adminJobs");
  const tc = useTranslations("common");
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      size="sm"
      variant="secondary"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await removeJob(id);
          if (!result.ok) {
            toast.error(tc("retry"));
            return;
          }
          toast.success(t("closed"));
          router.refresh();
        })
      }
    >
      {t("close")}
    </Button>
  );
}
