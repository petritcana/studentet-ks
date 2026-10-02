"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { deleteAnnouncement } from "@/lib/actions/announcements";
import { AnnouncementForm, type AnnouncementDraft } from "./announcement-form";

/** «Ndrysho»: i njëjti formular, i hapur me vlerat e njoftimit. `autoOpen` vjen nga `?ndrysho=`. */
export function EditAnnouncementButton({ draft, autoOpen = false }: { draft: AnnouncementDraft; autoOpen?: boolean }) {
  const t = useTranslations("adminAnnouncements");
  const [open, setOpen] = React.useState(autoOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" data-announcement-edit={draft.id}>
          <Pencil />
          {t("edit")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
          <DialogDescription>{t("editBody")}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <AnnouncementForm initial={draft} onDone={() => setOpen(false)} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

/** Fshirja, me konfirmim në të njëjtin buton: prekja e dytë e fshin. */
export function DeleteAnnouncementButton({ id }: { id: string }) {
  const t = useTranslations("adminAnnouncements");
  const tc = useTranslations("common");
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      size="sm"
      variant={confirming ? "danger" : "ghost"}
      loading={pending}
      onBlur={() => setConfirming(false)}
      onClick={() => {
        if (!confirming) {
          setConfirming(true);
          return;
        }
        startTransition(async () => {
          const result = await deleteAnnouncement(id);
          if (!result.ok) {
            toast.error(tc("retry"));
            return;
          }
          toast.success(t("deleted"));
          router.refresh();
        });
      }}
      data-announcement-delete={id}
    >
      <Trash2 />
      {confirming ? t("deleteConfirm") : tc("delete")}
    </Button>
  );
}
