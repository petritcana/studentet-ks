"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { confirmPayment } from "@/lib/actions/admin";

export function ConfirmPaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      size="sm"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await confirmPayment(paymentId);
          if (!result.ok) {
            toast.error(tc("retry"));
            return;
          }
          toast.success(t("confirmed"));
          router.refresh();
        })
      }
    >
      <Check />
      {t("confirmPayment")}
    </Button>
  );
}
