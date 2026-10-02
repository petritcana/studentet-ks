"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, Trash2, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { unblockUser } from "@/lib/actions/social";
import {
  deleteMyAccount,
  exportMyData,
  saveMyInterests,
  savePreferences,
  saveUsername,
} from "@/lib/actions/settings";
import { INTEREST_KEYS } from "@/lib/types";

export type SettingsUser = {
  username: string;
  email: string;
  interests: string[];
  pushEnabled: boolean;
  emailDigest: boolean;
  showReadReceipts: boolean;
  showOnlineStatus: boolean;
  showLastActive: boolean;
  analyticsConsent: boolean;
  isPrivate: boolean;
  autoAcceptFollows: boolean;
};

export type BlockedPerson = { id: string; name: string; username: string; kind: string };

/**
 * Cilësimet.
 *
 * Çdo çelës ka një fjali që shpjegon pasojën, sepse një ndërrues pa shpjegim
 * është kurth. Fshirja e llogarisë kërkon një fjalë të shkruar, jo një klikim.
 */
export function SettingsPanel({
  user,
  blocked,
}: {
  user: SettingsUser;
  blocked: BlockedPerson[];
}) {
  const router = useRouter();
  const t = useTranslations("settings");
  const ti = useTranslations("interest");
  const tc = useTranslations("common");

  const [username, setUsername] = React.useState(user.username);
  const [interests, setInterests] = React.useState(user.interests);
  const [prefs, setPrefs] = React.useState({
    pushEnabled: user.pushEnabled,
    emailDigest: user.emailDigest,
    showReadReceipts: user.showReadReceipts,
    showOnlineStatus: user.showOnlineStatus,
    showLastActive: user.showLastActive,
    analyticsConsent: user.analyticsConsent,
    isPrivate: user.isPrivate,
    autoAcceptFollows: user.autoAcceptFollows,
  });
  const [confirmation, setConfirmation] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function togglePreference(key: keyof typeof prefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    startTransition(async () => {
      const result = await savePreferences(next);
      if (!result.ok) {
        setPrefs(prefs);
        toast.error(tc("retry"));
        return;
      }
      router.refresh();
    });
  }

  function commitUsername() {
    if (username === user.username) return;
    startTransition(async () => {
      const result = await saveUsername(username);
      if (!result.ok) {
        setUsername(user.username);
        toast.error(
          result.messageKey === "settings.usernameTaken" ? t("usernameTaken") : tc("retry"),
        );
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    });
  }

  function toggleInterest(key: string) {
    const next = interests.includes(key)
      ? interests.filter((item) => item !== key)
      : [...interests, key];
    setInterests(next);
    startTransition(async () => {
      await saveMyInterests(next);
      router.refresh();
    });
  }

  function download() {
    startTransition(async () => {
      const result = await exportMyData();
      if (!result.ok || !result.payload) {
        toast.error(tc("retry"));
        return;
      }
      const blob = new Blob([result.payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "studentet-ks-te-dhenat.json";
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t("exported"));
    });
  }

  function removeAccount() {
    startTransition(async () => {
      const result = await deleteMyAccount(confirmation);
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      window.location.href = "/";
    });
  }

  const switches = [
    // Privatësia e profilit rri e para: ajo vendos kush i sheh postimet dhe stories.
    { key: "isPrivate" as const, label: t("privateProfile"), help: t("privateProfileHelp") },
    { key: "autoAcceptFollows" as const, label: t("autoAccept"), help: t("autoAcceptHelp") },
    { key: "pushEnabled" as const, label: t("push"), help: t("notificationsHelp") },
    { key: "emailDigest" as const, label: t("emailDigest"), help: t("emailDigestHelp") },
    { key: "showReadReceipts" as const, label: t("readReceipts"), help: t("readReceiptsHelp") },
    // Dy celesa te ndare: dikush e pranon te duket online pa e treguar orarin.
    { key: "showOnlineStatus" as const, label: t("onlineStatus"), help: t("onlineStatusHelp") },
    { key: "showLastActive" as const, label: t("lastActive"), help: t("lastActiveHelp") },
    { key: "analyticsConsent" as const, label: t("analytics"), help: t("analyticsHelp") },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-4 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-text">{t("profile")}</h2>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-username">{t("username")}</Label>
          <Input
            id="settings-username"
            value={username}
            maxLength={24}
            onChange={(event) => setUsername(event.target.value)}
            onBlur={commitUsername}
          />
          <p className="text-xs text-text-muted">{t("usernameHelp")}</p>
        </div>

        <p className="text-xs text-text-muted">{t("accountEmail", { email: user.email })}</p>
      </Card>

      <Card className="flex flex-col gap-3 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-text">{t("interests")}</h2>
        <p className="text-xs text-text-muted">{t("interestsHelp")}</p>
        <ChipGroup>
          {INTEREST_KEYS.map((key) => (
            <Chip
              key={key}
              selected={interests.includes(key)}
              onClick={() => toggleInterest(key)}
            >
              {ti(key)}
            </Chip>
          ))}
        </ChipGroup>
      </Card>

      <Card className="flex flex-col gap-4 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-text">{t("notifications")}</h2>

        {switches.map((item) => (
          <div key={item.key} className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Label htmlFor={`settings-${item.key}`}>{item.label}</Label>
              <p className="measure text-xs text-text-muted">{item.help}</p>
            </div>
            <Switch
              id={`settings-${item.key}`}
              checked={prefs[item.key]}
              disabled={pending}
              onCheckedChange={(value) => togglePreference(item.key, value)}
            />
          </div>
        ))}
      </Card>

      <Card className="flex flex-col gap-3 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-text">{t("blocked")}</h2>
        <p className="text-xs text-text-muted">{t("blockedHelp")}</p>

        {blocked.length === 0 ? (
          <p className="text-sm text-text-muted">{t("blockedEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {blocked.map((person) => (
              <li key={person.id} className="flex items-center gap-3 text-sm">
                <UserX className="size-4 shrink-0 text-text-muted" />
                <span className="min-w-0 flex-1 truncate text-text">{person.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    startTransition(async () => {
                      await unblockUser(person.id);
                      router.refresh();
                    })
                  }
                >
                  {t("unblock")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-3 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-text">{t("data")}</h2>
        <p className="measure text-xs text-text-muted">{t("dataHelp")}</p>

        <Button variant="secondary" size="sm" className="self-start" onClick={download}>
          <Download />
          {t("export")}
        </Button>
      </Card>

      <Card className="flex flex-col gap-3 border-danger/30 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-danger-text">{t("deleteAccount")}</h2>
        <p className="measure text-xs text-text-muted">{t("deleteBody")}</p>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-48 flex-1 flex-col gap-1.5">
            <Label htmlFor="settings-delete">{t("deleteConfirm")}</Label>
            <Input
              id="settings-delete"
              value={confirmation}
              maxLength={24}
              placeholder={t("deleteWord")}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </div>
          <Button
            variant="danger"
            loading={pending}
            disabled={confirmation.trim().toLowerCase() !== t("deleteWord")}
            onClick={removeAccount}
          >
            <Trash2 />
            {t("deleteFinal")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
