"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { leaveGroupChat } from "@/lib/actions/messages";

/** Dalja kërkon konfirmim: pas saj, grupi nuk të shfaqet më derisa dikush të shtojë prapë. */
export function LeaveGroupButton({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const t = useTranslations("messages");
  const tc = useTranslations("common");
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function leave() {
    startTransition(async () => {
      const result = await leaveGroupChat(conversationId);
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      setOpen(false);
      toast.success(t("leftGroup"));
      router.push("/mesazhe");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="iconSm" aria-label={t("leaveGroup")} title={t("leaveGroup")}>
          <LogOut />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("leaveGroupTitle")}</DialogTitle>
          <DialogDescription>{t("leaveGroupBody")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {tc("cancel")}
          </Button>
          <Button variant="danger" onClick={leave} loading={pending}>
            {t("leaveGroup")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
