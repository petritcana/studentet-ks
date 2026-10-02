"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { setAnnouncementActive } from "@/lib/actions/announcements";

export function AnnouncementToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const t = useTranslations("adminAnnouncements");
  const tc = useTranslations("common");
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      size="sm"
      variant={isActive ? "secondary" : "outline"}
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setAnnouncementActive(id, !isActive);
          if (!result.ok) {
            toast.error(tc("retry"));
            return;
          }
          router.refresh();
        })
      }
    >
      {isActive ? t("hide") : t("show")}
    </Button>
  );
}
