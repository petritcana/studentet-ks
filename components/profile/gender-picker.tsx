"use client";

import { useTranslations } from "next-intl";
import { defaultAvatarFor, type Gender } from "@/lib/default-avatar";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Gender | null; key: string }[] = [
  { value: "male", key: "genderMale" },
  { value: "female", key: "genderFemale" },
  { value: null, key: "genderNone" },
];

/**
 * Zgjedhja e avatarit kur nuk ka foto: djalë, vajzë, ose pa thënë.
 * Secila zgjedhje tregon vetë avatarin që do të dalë.
 */
export function GenderPicker({
  value,
  onChange,
  disabled,
}: {
  value: Gender | null;
  onChange: (next: Gender | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("settings");

  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-medium text-text">{t("genderLabel")}</p>
        <p className="text-xs text-text-muted">{t("genderHelp")}</p>
      </div>
      <div role="radiogroup" aria-label={t("genderLabel")} className="flex flex-wrap gap-2" data-gender-picker>
        {OPTIONS.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-sm font-medium transition-colors duration-150",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-60",
                active
                  ? "border-brand-500/60 bg-brand-50 text-text"
                  : "border-border text-text-muted hover:border-border-strong hover:text-text",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={defaultAvatarFor(option.value)} alt="" className="size-7 rounded-full" />
              {t(option.key)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
