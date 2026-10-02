"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { followUser } from "@/lib/actions/social";

/**
 * «Ndiqe edhe ti», drejt te njoftimi.
 *
 * Kush të ndoqi, ose kujt ia pranove kërkesën, ndiqet mbrapsht me një prekje,
 * pa kaluar nga profili. Pas prekjes butoni mbetet si shenjë e qetë.
 */
export function FollowBackButton({ userId, name, className }: { userId: string; name: string; className?: string }) {
  const t = useTranslations("social");
  const router = useRouter();
  const [done, setDone] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-text-muted" data-followed-back>
        <Check className="size-3.5" aria-hidden />
        {t("following")}
      </span>
    );
  }

  return (
    <Button
      size="sm"
      className={className}
      loading={pending}
      onClick={(event) => {
        // Rreshti i njoftimit është lidhje: prekja e butonit nuk e hap atë.
        event.preventDefault();
        event.stopPropagation();
        setDone(true);
        startTransition(async () => {
          const result = await followUser(userId);
          if (!result.ok) {
            setDone(false);
            toast.error(t("followFailed"));
            return;
          }
          toast.success(result.messageKey === "social.nowFriends" ? t("nowFriends") : `${t("following")} ${name}`);
          router.refresh();
        });
      }}
      data-follow-back
    >
      {t("followBack")}
    </Button>
  );
}
