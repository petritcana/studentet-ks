"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Gift } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { TooltipContent, TooltipRoot, TooltipTrigger } from "@/components/ui/tooltip";
import { grantPro, revokePro } from "@/lib/actions/admin-pro";
import { cn } from "@/lib/utils";

const QUICK_HOURS = [24, 48, 168, 720] as const;

/**
 * «Jep Pro» te profili i dikujt, vetëm për adminët.
 *
 * I njëjti veprim si te `/admin/pro`: orët shkruhen me dorë ose zgjidhen shpejt,
 * Pro-ja nis menjëherë, shtohet mbi atë që ka personi dhe mbaron vetë. Serveri e
 * kontrollon prapë që kush e jep është admin.
 */
export function ProfileProButton({
  userId,
  name,
  proUntilLabel,
}: {
  userId: string;
  name: string;
  /** Deri kur e ka Pro-në e fituar ose të dhuruar, e formatuar në server. Null kur s'ka. */
  proUntilLabel: string | null;
}) {
  const t = useTranslations("adminPro");
  const tAll = useTranslations();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [hours, setHours] = React.useState("48");
  const [reason, setReason] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const firstName = name.split(" ")[0];

  const value = Number.parseInt(hours, 10);
  const valid = Number.isInteger(value) && value >= 1 && value <= 24 * 365;
  const days = Math.floor(value / 24);
  const rest = value % 24;
  const duration = !valid
    ? t("hoursInvalid")
    : days === 0
      ? t("durationHours", { hours: value })
      : rest === 0
        ? t("durationDays", { hours: value, days })
        : t("durationMixed", { hours: value, days, rest });

  function give() {
    if (!valid) return;
    startTransition(async () => {
      const result = await grantPro({ userId, hours: value, reason: reason || undefined });
      if (!result.ok) {
        toast.error(tAll(result.messageKey ?? "common.retry", result.values));
        return;
      }
      toast.success(t("grantedTo", { name: firstName, duration }));
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  function stop() {
    startTransition(async () => {
      await revokePro(userId);
      toast.success(t("revokedFrom", { name: firstName }));
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipRoot>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="secondary" size="iconSm" aria-label={t("giveTo", { name: firstName })} data-profile-give-pro>
              <Gift />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("giveTo", { name: firstName })}</TooltipContent>
      </TooltipRoot>

      <DialogContent className="sm:max-w-md" data-profile-pro-dialog>
        <DialogHeader>
          <DialogTitle>{t("giveTo", { name: firstName })}</DialogTitle>
          <DialogDescription>{proUntilLabel ? t("hasProUntil", { name: firstName, date: proUntilLabel }) : t("profileBody")}</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-pro-hours" className="text-sm font-semibold text-text">
              {t("hours")}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="profile-pro-hours"
                type="number"
                inputMode="numeric"
                min={1}
                max={24 * 365}
                value={hours}
                onChange={(event) => setHours(event.target.value)}
                className="w-28"
                data-profile-pro-hours
              />
              {QUICK_HOURS.map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setHours(String(quick))}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                    value === quick ? "border-brand-500 bg-brand-50 text-brand-500" : "border-border text-text-muted hover:text-text",
                  )}
                >
                  {t(`quick_${quick}`)}
                </button>
              ))}
            </div>
            <p className={cn("text-xs", valid ? "text-text-muted" : "text-danger-text")} aria-live="polite">
              {duration}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-pro-reason" className="text-sm font-semibold text-text">
              {t("reason")}
            </label>
            <Input id="profile-pro-reason" value={reason} maxLength={200} onChange={(event) => setReason(event.target.value)} placeholder={t("reasonPlaceholder")} />
          </div>
        </DialogBody>
        <DialogFooter className="flex-row items-center justify-between gap-2">
          {proUntilLabel ? (
            <Button variant="ghost" onClick={stop} disabled={pending} className="text-danger-text" data-profile-stop-pro>
              {t("revoke")}
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={give} disabled={!valid} loading={pending} data-profile-pro-give>
            <Gift />
            {t("give")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
