"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import { openConversation } from "@/lib/actions/campus";

/**
 * DM-ja hapet vetvetiu mes shokëve. Me të tjerët nis si kërkesë, prandaj butoni
 * e thotë këtë me tooltip në vend që ta fshehë.
 */
export function MessageButton({
  targetId,
  disabled = false,
}: {
  targetId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function open() {
    startTransition(async () => {
      const result = await openConversation(targetId);
      if (!result.ok || !result.conversationId) {
        toast.error(result.message ?? "S'u hap dot biseda.");
        return;
      }
      router.push(`/mesazhe/${result.conversationId}`);
    });
  }

  const button = (
    <Button variant="secondary" size="pill" onClick={open} loading={pending}>
      <MessageSquare />
      Shkruaj
    </Button>
  );

  if (!disabled) return button;

  return (
    <Tooltip label="Bëhuni shokë dhe biseda hapet pa kufizime. Deri atëherë shkon si kërkesë.">
      <span>{button}</span>
    </Tooltip>
  );
}
