"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { MediaPicker } from "@/components/feed/media-picker";
import { createPost } from "@/lib/actions/posts";
import type { MediaRef } from "@/lib/media";

/**
 * Shkrimi brenda një grupi.
 *
 * Grupi pa kuti shkrimi ishte vetëm listë anëtarësh: postimet vinin nga feed-i
 * dhe askush nuk dinte ku t'i shkruante. Shtrirja nuk pyetet këtu, sepse grupi
 * vetë është shtrirja.
 */
export function GroupComposer({
  groupId,
  me,
}: {
  groupId: string;
  me: { name: string; avatar: string | null };
}) {
  const router = useRouter();
  const t = useTranslations("campus");
  const tf = useTranslations("feed");
  const tc = useTranslations("common");

  const [text, setText] = React.useState("");
  const [media, setMedia] = React.useState<MediaRef[]>([]);
  const [pending, startTransition] = React.useTransition();

  function submit() {
    const value = text.trim();
    if (value.length < 1 && media.length === 0) return;

    startTransition(async () => {
      const result = await createPost({
        type: "text",
        scope: "faculty",
        text: value,
        groupId,
        media,
      });

      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }

      setText("");
      setMedia([]);
      toast.success(tf("posted"));
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <Avatar name={me.name} src={me.avatar} size="sm" />
        <Textarea
          autoGrow
          value={text}
          maxLength={1000}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("groupComposerPlaceholder")}
          aria-label={t("groupComposerPlaceholder")}
          className="min-h-11"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <MediaPicker media={media} onChange={setMedia} max={4} />
        <Button
          size="sm"
          className="ml-auto"
          onClick={submit}
          loading={pending}
          disabled={text.trim().length < 1 && media.length === 0}
        >
          <Send />
          {tf("post")}
        </Button>
      </div>
    </Card>
  );
}
