"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { setAdActive } from "@/lib/actions/ads";

export function AdToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const t = useTranslations("adminAds");
  const tc = useTranslations("common");
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      size="sm"
      variant={isActive ? "secondary" : "outline"}
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setAdActive(id, !isActive);
          if (!result.ok) {
            toast.error(tc("retry"));
            return;
          }
          router.refresh();
        })
      }
    >
      {isActive ? t("pause") : t("resume")}
    </Button>
  );
}
