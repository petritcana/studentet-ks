"use client";

import * as React from "react";
import { Bookmark } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { toggleBookmark } from "@/lib/actions/posts";
import { cn } from "@/lib/utils";

export function SaveButton({
  targetId,
  targetType,
  initialSaved,
  variant = "secondary",
  size,
}: {
  targetId: string;
  targetType: string;
  initialSaved: boolean;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const [saved, setSaved] = React.useState(initialSaved);
  const [pending, startTransition] = React.useTransition();

  function toggle() {
    const next = !saved;
    setSaved(next);

    startTransition(async () => {
      const result = await toggleBookmark(targetId, targetType);
      if (!result.ok) {
        setSaved(!next);
        toast.error(result.message ?? "S'u ruajt dot.");
        return;
      }
      if (next) toast.success("E ruajtëm", { description: "E gjen te Unë · Ruajtjet." });
    });
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
    >
      <Bookmark className={cn(saved && "fill-brand-500 text-brand-500")} />
      {saved ? "E ruajtur" : "Ruaje"}
    </Button>
  );
}
