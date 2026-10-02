"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Lock, Mic, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { createVoiceRoom } from "@/lib/actions/voice";
import type { PostScope } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Hapja e një dhomë zëri, brenda kompozuesit. */
export function VoiceRoomForm({
  scope,
  onCreated,
}: {
  scope: PostScope;
  onCreated: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("voice");
  const tc = useTranslations("common");

  const [title, setTitle] = React.useState("");
  const [access, setAccess] = React.useState<"open" | "password">("open");
  const [password, setPassword] = React.useState("");
  const [share, setShare] = React.useState(true);
  const [pending, startTransition] = React.useTransition();

  const ready = title.trim().length >= 3 && (access === "open" || password.length >= 4);

  function start() {
    startTransition(async () => {
      const result = await createVoiceRoom({
        title: title.trim(),
        access,
        password: access === "password" ? password : undefined,
        scope: scope === "university" ? "university" : scope === "national" ? "global" : "faculty",
        shareToFeed: share,
      });

      if (!result.ok || !result.roomId) {
        const key = (result.messageKey ?? "").replace("voice.", "");
        toast.error(key && key !== result.messageKey ? t(key) : tc("retry"));
        return;
      }

      onCreated();
      router.push(`/zeri/${result.roomId}`);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-2 p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="voice-title">{t("roomName")}</Label>
        <Input
          id="voice-title"
          value={title}
          maxLength={80}
          placeholder={t("roomNamePlaceholder")}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-text">{t("access")}</legend>

        <div className="flex flex-wrap gap-2">
          {(["open", "password"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={access === value}
              onClick={() => setAccess(value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
                "transition-colors duration-150 ease-brand",
                access === value
                  ? "border-brand-500 bg-brand-500/12 text-brand-500"
                  : "border-border bg-surface text-text-muted hover:text-text",
              )}
            >
              {value === "open" ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
              {t(value === "open" ? "accessOpen" : "accessPassword")}
            </button>
          ))}
        </div>
      </fieldset>

      {access === "password" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="voice-password">{t("password")}</Label>
          <Input
            id="voice-password"
            type="password"
            value={password}
            minLength={4}
            maxLength={64}
            autoComplete="off"
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className="text-xs text-text-muted">{t("passwordHint")}</p>
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={share}
          onChange={(event) => setShare(event.target.checked)}
          className="size-4 rounded-sm border-border accent-brand-500"
        />
        {t("shareToFeed")}
      </label>

      <Button onClick={start} loading={pending} disabled={!ready} size="sm" className="self-start">
        <Mic />
        {t("startRoom")}
      </Button>
    </div>
  );
}
