"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, MessageSquare, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { contactSeller, setListingStatus } from "@/lib/actions/market";

export function ListingActions({ listingId, isSeller, status }: { listingId: string; isSeller: boolean; status: string }) {
  const router = useRouter();
  const t = useTranslations("market");
  const tc = useTranslations("common");
  const [pending, startTransition] = React.useTransition();

  function run(action: () => Promise<{ ok: boolean; conversationId?: string }>, after: (id?: string) => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      after(result.conversationId);
    });
  }

  if (!isSeller) {
    return (
      <Button
        onClick={() => run(() => contactSeller(listingId), (id) => id && router.push(`/mesazhe/${id}`))}
        loading={pending}
        disabled={status !== "active"}
      >
        <MessageSquare />
        {t("messageSeller")}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "active" ? (
        <Button variant="secondary" loading={pending} onClick={() => run(() => setListingStatus(listingId, "sold"), () => router.refresh())}>
          <CheckCircle2 />
          {t("markSold")}
        </Button>
      ) : (
        <Button variant="secondary" loading={pending} onClick={() => run(() => setListingStatus(listingId, "active"), () => router.refresh())}>
          <RotateCcw />
          {t("markActive")}
        </Button>
      )}
      <Button
        variant="ghost"
        loading={pending}
        onClick={() =>
          run(() => setListingStatus(listingId, "removed"), () => {
            toast.success(t("removed"));
            router.push("/tregu");
          })
        }
      >
        <Trash2 />
        {t("remove")}
      </Button>
    </div>
  );
}
