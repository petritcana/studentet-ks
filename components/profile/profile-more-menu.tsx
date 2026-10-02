"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Ban, Flag, KeyRound, Link2, MoreHorizontal, Settings, VolumeX } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { blockUser } from "@/lib/actions/social";

export function ProfileMoreMenu({
  username,
  userId,
  isMe,
}: {
  username: string;
  userId: string;
  isMe: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const [confirming, setConfirming] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/u/${username}`);
      toast.success(t("linkCopied"));
    } catch {
      toast.error(tc("retry"));
    }
  }

  function apply(kind: "block" | "mute") {
    startTransition(async () => {
      const result = await blockUser(userId, kind);
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      toast.success(t(kind === "block" ? "blocked" : "muted"));
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t("moreActions")}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => void copyLink()}>
            <Link2 />
            {t("copyLink")}
          </DropdownMenuItem>

          {isMe ? (
            <DropdownMenuItem asChild>
              <Link href="/cilesimet">
                <Settings />
                {t("profileSettings")}
              </Link>
            </DropdownMenuItem>
          ) : null}
          {isMe ? (
            <DropdownMenuItem asChild>
              <Link href="/cilesimet#password" data-profile-password>
                <KeyRound />
                {t("changePassword")}
              </Link>
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => apply("mute")}>
                <VolumeX />
                {t("mute")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setConfirming(true)}>
                <Ban />
                {t("block")}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/moderimi/raporti?lloji=user&id=${userId}`}>
                  <Flag />
                  {t("report")}
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirming ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("blockTitle")}
          className="fixed inset-0 z-[60] grid place-items-center p-4"
        >
          <button
            type="button"
            aria-label={tc("close")}
            onClick={() => setConfirming(false)}
            className="absolute inset-0 bg-bg/70 backdrop-blur-sm"
          />

          <div className="relative flex w-full max-w-sm flex-col gap-3 rounded-lg border border-border bg-surface-solid p-5 shadow-lifted">
            <h2 className="text-base font-semibold text-text">{t("blockTitle")}</h2>
            <p className="measure text-sm text-text-muted">{t("blockBody")}</p>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                {tc("cancel")}
              </Button>
              <Button variant="danger" size="sm" loading={pending} onClick={() => apply("block")}>
                <Ban />
                {t("block")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
