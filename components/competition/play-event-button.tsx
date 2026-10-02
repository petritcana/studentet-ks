"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { playTeamEvent } from "@/lib/actions/competition";

/** Nis lojën e studentit në ngjarje. Serveri vendos nëse i takon. */
export function PlayEventButton({ eventId, label }: { eventId: string; label: string }) {
  const router = useRouter();
  const t = useTranslations("competition");
  const errors = useTranslations("errors");
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      data-play-event
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await playTeamEvent(eventId);
          if (!result.ok || !result.battleId) {
            const key = result.messageKey ?? "";
            toast.error(key.startsWith("competition.") ? t(key.replace("competition.", "")) : errors("generic"));
            return;
          }
          router.push(`/gara/beteja/${result.battleId}`);
        })
      }
    >
      <Swords />
      {label}
    </Button>
  );
}
