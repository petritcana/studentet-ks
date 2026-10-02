"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { saveNotificationPref } from "@/lib/actions/notification-prefs";
import { NOTIFICATION_CATEGORIES, type NotificationCategory } from "@/lib/notifications";

/**
 * Cilësat e njoftimeve, sipas kategorisë.
 *
 * Fikja e një kategorie e ndal vërtet njoftimin: `lib/notify.ts` e pyet këtë
 * rresht para se të shkruajë. Prandaj këtu nuk ka çelës që vetëm duket.
 */
export function NotificationPrefs({ initial }: { initial: Record<string, boolean> }) {
  const router = useRouter();
  const t = useTranslations("notificationPrefs");
  const tc = useTranslations("common");

  const [state, setState] = React.useState<Record<string, boolean>>(initial);
  const [pending, startTransition] = React.useTransition();

  function toggle(category: NotificationCategory, next: boolean) {
    const previous = state[category] ?? true;
    setState((current) => ({ ...current, [category]: next }));

    startTransition(async () => {
      const result = await saveNotificationPref({ category, inApp: next });
      if (!result.ok) {
        setState((current) => ({ ...current, [category]: previous }));
        toast.error(tc("retry"));
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
          <Bell className="size-4 text-brand-500" />
          {t("title")}
        </h2>
        <p className="measure text-xs text-text-muted">{t("body")}</p>
      </div>

      <div className="flex flex-col gap-3">
        {NOTIFICATION_CATEGORIES.map((category) => (
          <div key={category} className="flex items-center justify-between gap-3">
            <Label htmlFor={`notif-${category}`} className="text-sm font-normal text-text">
              {t(`category_${category}`)}
            </Label>
            <Switch
              id={`notif-${category}`}
              checked={state[category] ?? true}
              disabled={pending}
              onCheckedChange={(next) => toggle(category, next)}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
