"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { createGroup } from "@/lib/actions/groups";
import { cn } from "@/lib/utils";

const PRIVACY = ["public", "request", "invite"] as const;

/**
 * Hapja e një grupi.
 *
 * Grupin e hap studenti, jo admini: kjo është hapësira e tyre. Privatësia
 * zgjidhet që në fillim, sepse ndryshimi i saj më vonë e habit atë që hyri.
 */
export function CreateGroupDialog() {
  const router = useRouter();
  const t = useTranslations("campus");
  const tc = useTranslations("common");

  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [privacy, setPrivacy] = React.useState<string>("public");
  const [pending, startTransition] = React.useTransition();

  function submit() {
    startTransition(async () => {
      const result = await createGroup({ name, description, privacy });
      if (!result.ok) {
        toast.error(
          result.messageKey?.startsWith("campus.")
            ? t(result.messageKey.replace("campus.", ""))
            : tc("retry"),
        );
        return;
      }

      toast.success(t("groupCreated"));
      setOpen(false);
      setName("");
      setDescription("");
      if (result.groupId) router.push(`/grupet/${result.groupId}`);
      else router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Plus />
          {t("createGroup")}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createGroup")}</DialogTitle>
          <DialogDescription>{t("createGroupBody")}</DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          <Field label={t("groupName")} htmlFor="group-name">
            <Input
              id="group-name"
              value={name}
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("groupNamePlaceholder")}
            />
          </Field>

          <Field label={t("groupDescription")} htmlFor="group-description" hint={tc("optional")}>
            <Textarea
              id="group-description"
              autoGrow
              maxLength={300}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-medium text-text">{t("groupPrivacy")}</legend>
            <div className="flex flex-wrap gap-1.5">
              {PRIVACY.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={privacy === value}
                  onClick={() => setPrivacy(value)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors duration-150",
                    privacy === value
                      ? "border-brand-500 bg-brand-500/10 text-text"
                      : "border-border bg-surface text-text-muted hover:text-text",
                  )}
                >
                  {t(`privacy_${value}`)}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted">{t(`privacyHelp_${privacy}`)}</p>
          </fieldset>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={submit} loading={pending} disabled={name.trim().length < 3}>
            {t("createGroup")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
