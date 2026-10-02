"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markAllRead } from "@/lib/actions/notifications";

export function MarkAllReadButton() {
  const router = useRouter();
  const t = useTranslations("notifications");
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      size="sm"
      variant="secondary"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          await markAllRead();
          router.refresh();
        })
      }
    >
      <CheckCheck />
      {t("markAllRead")}
    </Button>
  );
}
