"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { completeLesson } from "@/lib/actions/courses";

export function CompleteLessonButton({ lessonId, completed }: { lessonId: string; completed: boolean }) {
  const router = useRouter();
  const t = useTranslations("courses");
  const tc = useTranslations("common");
  const [done, setDone] = React.useState(completed);
  const [pending, startTransition] = React.useTransition();

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-success-text">
        <Check className="size-4" />
        {t("lessonDone")}
      </span>
    );
  }

  return (
    <Button
      size="sm"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await completeLesson(lessonId);
          if (!result.ok) {
            toast.error(tc("retry"));
            return;
          }
          setDone(true);
          if (result.certificate) toast.success(t("certificateEarned", { code: result.certificate }));
          router.refresh();
        })
      }
    >
      <Check />
      {t("markDone")}
    </Button>
  );
}
