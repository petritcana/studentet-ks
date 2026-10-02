"use client";

import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useComposer } from "./composer-context";
import { cn } from "@/lib/utils";

export function ComposerTrigger({
  user,
}: {
  user: { name: string; avatar: string | null };
}) {
  const t = useTranslations("feed");
  const composer = useComposer();

  if (!composer) return null;

  return (
    <div className="glass flex items-center gap-2 rounded-card p-2.5 sm:gap-3 sm:p-3">
      <Avatar name={user.name} src={user.avatar} size="md" className="shrink-0 sm:size-[42px]" />

      <button
        type="button"
        onClick={() => composer.open()}
        className={cn(
          "h-[46px] min-w-0 flex-1 truncate rounded-control border border-border bg-surface-2 px-4 text-left",
          "text-sm text-text-dim transition-all duration-150 ease-brand sm:text-[15px]",
          "hover:border-border-strong hover:text-text-muted",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500",
        )}
      >
        {t("composerPrompt")}
      </button>

      <Button onClick={() => composer.open()} className="h-[46px] shrink-0 px-6 text-[14.5px] font-bold shadow-none hover:shadow-cta">
        {t("createPost")}
      </Button>
    </div>
  );
}
