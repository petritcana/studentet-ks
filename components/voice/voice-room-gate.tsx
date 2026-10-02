"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Lock, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { joinVoiceRoom } from "@/lib/actions/voice";

/** Porta e dhomës. */
export function VoiceRoomGate({
  roomId,
  title,
  description,
  hostName,
  needsPassword,
  listeners,
  joinLabel,
}: {
  roomId: string;
  title: string;
  description: string | null;
  hostName: string;
  needsPassword: boolean;
  listeners: number;
  joinLabel: string;
}) {
  const router = useRouter();
  const t = useTranslations("voice");
  const tc = useTranslations("common");

  const [password, setPassword] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function join() {
    startTransition(async () => {
      const result = await joinVoiceRoom(roomId, needsPassword ? password : undefined);
      if (!result.ok) {
        const key = (result.messageKey ?? "").replace("voice.", "");
        toast.error(key && key !== result.messageKey ? t(key) : tc("retry"));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-8">
      <Card className="flex flex-col gap-3 p-5">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-500/12 px-2.5 py-1 text-xs font-medium text-brand-500">
          {needsPassword ? <Lock className="size-3.5" /> : <Mic className="size-3.5" />}
          {t(needsPassword ? "accessPassword" : "accessOpen")}
        </span>

        <h1 className="text-lg font-semibold tracking-tight text-text">{title}</h1>
        {description ? <p className="measure text-sm text-text-muted">{description}</p> : null}

        <p className="text-xs text-text-muted">
          {hostName} · {t("listeners", { count: listeners })}
        </p>

        {needsPassword ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="room-password">{t("enterPassword")}</Label>
            <Input
              id="room-password"
              type="password"
              value={password}
              autoComplete="off"
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") join();
              }}
            />
          </div>
        ) : null}

        <Button
          onClick={join}
          loading={pending}
          disabled={needsPassword && password.length < 4}
          className="self-start"
        >
          <Mic />
          {joinLabel}
        </Button>
      </Card>
    </div>
  );
}
