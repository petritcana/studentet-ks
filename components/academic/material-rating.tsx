"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { rateMaterial } from "@/lib/actions/academic";
import { cn } from "@/lib/utils";

export function MaterialRating({
  materialId,
  initialValue,
  disabled,
  disabledHint,
}: {
  materialId: string;
  initialValue: number;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(initialValue);
  const [hover, setHover] = React.useState(0);
  const [pending, startTransition] = React.useTransition();

  function rate(next: number) {
    if (disabled) return;
    const previous = value;
    setValue(next);

    startTransition(async () => {
      const result = await rateMaterial(materialId, next);
      if (!result.ok) {
        setValue(previous);
        toast.error(result.message ?? "S'u ruajt dot vlerësimi.");
        return;
      }
      toast.success(result.message ?? "E vlerësove.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="flex items-center gap-0.5"
        role="radiogroup"
        aria-label="Vlerëso materialin"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} yje`}
            disabled={disabled || pending}
            onClick={() => rate(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className={cn(
              "rounded-sm p-0.5 transition-transform duration-150",
              !disabled && "hover:scale-110",
              disabled && "cursor-not-allowed",
            )}
          >
            <Star
              className={cn(
                "size-6",
                (hover || value) >= star
                  ? "fill-warning text-warning"
                  : "text-text-muted",
              )}
            />
          </button>
        ))}
      </div>
      {disabled && disabledHint ? (
        <p className="text-xs text-text-muted">{disabledHint}</p>
      ) : (
        <p className="text-xs text-text-muted">
          Tre vlerësime pozitive e kalojnë materialin te «I verifikuar».
        </p>
      )}
    </div>
  );
}
