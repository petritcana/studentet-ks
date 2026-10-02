"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PeopleSearch } from "./people-search";

/** Parametri që e hap dialogun vetë, p.sh. nga paneli i mesazheve te shiriti i sipërm. */
export const NEW_CHAT_PARAM = "e-re";

/** «Bisedë e re»: kërkon një person dhe hap bisedën me të. */
/** `compact`: vetëm ikona, për kokën e kolonës së bisedave. */
export function NewChatDialog({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("messages");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = React.useState(params.get(NEW_CHAT_PARAM) === "1");

  function change(next: boolean) {
    setOpen(next);
    // Parametri hiqet pas mbylljes, që rifreskimi të mos e hapë sërish.
    if (!next && params.get(NEW_CHAT_PARAM)) router.replace(pathname);
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogTrigger asChild>
        {compact ? (
          <Button size="iconSm" aria-label={t("newChat")} title={t("newChat")} data-new-chat-compact>
            <SquarePen />
          </Button>
        ) : (
          <Button size="sm" data-new-chat>
            <SquarePen />
            {t("newChat")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("newChat")}</DialogTitle>
          <DialogDescription>{t("newChatBody")}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <PeopleSearch autoFocus onOpened={() => setOpen(false)} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
