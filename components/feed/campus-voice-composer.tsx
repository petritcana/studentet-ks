"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { EyeOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { createPost } from "@/lib/actions/posts";
import { POST_TEXT_LIMIT } from "@/lib/constants";

export function CampusVoiceComposer({ allowed }: { allowed: boolean }) {
  const router = useRouter();
  const t = useTranslations("feed");
  const tc = useTranslations("common");

  const [text, setText] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function submit() {
    startTransition(async () => {
      const result = await createPost({ type: "campus_voice", scope: "faculty", text });
      if (!result.ok) {
        toast.error(result.messageKey === "feed.anonymousLocked" ? t("anonymousLocked") : tc("retry"));
        return;
      }
      toast.success(t("posted"));
      setText("");
      router.refresh();
    });
  }

  if (!allowed) {
    return (
      <Card className="flex flex-col gap-1 p-4">
        <p className="text-sm text-text">{t("anonymousLocked")}</p>
        <p className="text-xs text-text-muted">{t("anonymousRules")}</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-text-muted">
          <EyeOff className="size-4" aria-hidden />
        </span>
        <Textarea
          autoGrow
          value={text}
          maxLength={POST_TEXT_LIMIT}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("composePlaceholder")}
          className="min-h-20 border-0 bg-transparent px-0 focus:ring-0"
          aria-label={t("compose")}
        />
      </div>

      <p className="text-xs text-text-muted">{t("anonymousRules")}</p>

      <Button
        size="sm"
        onClick={submit}
        loading={pending}
        disabled={text.trim().length < 3}
        className="self-start"
      >
        <Send />
        {t("post")}
      </Button>
    </Card>
  );
}
