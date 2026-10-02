"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { featureProfile, saveAdvancedPrivacy, saveProAppearance } from "@/lib/actions/pro";
import {
  FOLLOW_AUDIENCES,
  MESSAGE_AUDIENCES,
  PRO_ACCENTS,
  PRO_COVERS,
  type ProAccentKey,
  type ProCoverKey,
} from "@/lib/pro";
import { proAccentStyle } from "@/lib/pro-appearance";
import { cn } from "@/lib/utils";

type Accent = ProAccentKey;
type Cover = ProCoverKey;

const ACCENTS = PRO_ACCENTS;
const COVERS = PRO_COVERS;

/**
 * Pika e ngjyrës.
 *
 * Ngjyra vjen nga i njëjti variabël që e ngjyros profilin, prandaj ajo që
 * zgjedh studenti është saktësisht ajo që sheh më pas.
 */
function swatchStyle(accent: Accent) {
  return { ...proAccentStyle(accent), backgroundColor: "var(--pro-accent-fill)" };
}

export type ProSettingsState = {
  isPro: boolean;
  accent: string | null;
  coverStyle: string | null;
  featured: boolean;
  whoCanFollow: string;
  whoCanMessage: string;
};

/**
 * Cilësimet që vijnë me Pro.
 *
 * Kur studenti nuk e ka Pro-n, seksioni nuk fshihet: shfaqet i kyçur me një
 * fjali që thotë çfarë hap. Fshehja do ta linte pa e ditur se ekziston, dhe
 * muri i pagesës duhet të shpjegojë, jo të bërtasë.
 */
export function ProSettings({ initial }: { initial: ProSettingsState }) {
  const router = useRouter();
  const t = useTranslations("pro");
  const tc = useTranslations("common");

  const [accent, setAccent] = React.useState<Accent | null>((initial.accent as Accent) ?? null);
  const [cover, setCover] = React.useState<Cover | null>((initial.coverStyle as Cover) ?? null);
  const [featured, setFeatured] = React.useState(initial.featured);
  const [whoCanFollow, setWhoCanFollow] = React.useState(initial.whoCanFollow);
  const [whoCanMessage, setWhoCanMessage] = React.useState(initial.whoCanMessage);
  const [pending, startTransition] = React.useTransition();

  function run(work: () => Promise<{ ok: boolean; messageKey?: string }>, undo?: () => void) {
    startTransition(async () => {
      const result = await work();
      if (!result.ok) {
        undo?.();
        toast.error(result.messageKey ? t(result.messageKey.replace("pro.", "")) : tc("retry"));
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    });
  }

  if (!initial.isPro) {
    return (
      <Card className="flex flex-col items-start gap-3 p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
          <Lock className="size-4 text-text-muted" />
          {t("settingsTitle")}
        </h2>
        <p className="measure text-sm text-text-muted">{t("settingsLocked")}</p>
        <Button asChild size="sm">
          <Link href="/une/pro">
            {t("settingsLockedCta")}
            <ArrowRight />
          </Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
        <Sparkles className="size-4 text-brand-500" />
        {t("settingsTitle")}
      </h2>

      <div className="flex flex-col gap-2">
        <Label>{t("accent")}</Label>
        <p className="text-xs text-text-muted">{t("accentHelp")}</p>
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((item) => (
            <button
              key={item}
              type="button"
              aria-label={t(`accent_${item}`)}
              aria-pressed={accent === item}
              disabled={pending}
              onClick={() => {
                const previous = accent;
                setAccent(item);
                run(() => saveProAppearance({ accent: item, coverStyle: cover }), () => setAccent(previous));
              }}
              style={swatchStyle(item)}
              className={cn(
                "size-8 rounded-full border-2 transition-all duration-150",
                accent === item ? "border-text scale-110" : "border-transparent",
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("cover")}</Label>
        <div className="flex flex-wrap gap-2">
          {COVERS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={cover === item}
              disabled={pending}
              onClick={() => {
                const previous = cover;
                setCover(item);
                run(() => saveProAppearance({ accent, coverStyle: item }), () => setCover(previous));
              }}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors duration-150",
                cover === item
                  ? "border-brand-500 bg-brand-500/10 text-text"
                  : "border-border bg-surface text-text-muted hover:text-text",
              )}
            >
              {t(`cover_${item}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 border-t border-border pt-4">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="pro-featured">{t("featuredProfile")}</Label>
          <p className="measure text-xs text-text-muted">{t("featuredProfileHelp")}</p>
        </div>
        <Switch
          id="pro-featured"
          checked={featured}
          disabled={pending}
          onCheckedChange={(next) => {
            setFeatured(next);
            run(() => featureProfile(next), () => setFeatured(!next));
          }}
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-text">{t("privacyTitle")}</h3>
        <p className="measure text-xs text-text-muted">{t("privacyHelp")}</p>

        <Choice
          label={t("whoCanFollow")}
          value={whoCanFollow}
          options={FOLLOW_AUDIENCES.map((key) => ({ key, label: t(`follow_${key}`) }))}
          disabled={pending}
          onChange={(next) => {
            const previous = whoCanFollow;
            setWhoCanFollow(next);
            run(
              () => saveAdvancedPrivacy({ whoCanFollow: next as never, whoCanMessage: whoCanMessage as never }),
              () => setWhoCanFollow(previous),
            );
          }}
        />

        <Choice
          label={t("whoCanMessage")}
          value={whoCanMessage}
          options={MESSAGE_AUDIENCES.map((key) => ({ key, label: t(`message_${key}`) }))}
          disabled={pending}
          onChange={(next) => {
            const previous = whoCanMessage;
            setWhoCanMessage(next);
            run(
              () => saveAdvancedPrivacy({ whoCanFollow: whoCanFollow as never, whoCanMessage: next as never }),
              () => setWhoCanMessage(previous),
            );
          }}
        />
      </div>
    </Card>
  );
}

function Choice({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: { key: string; label: string }[];
  disabled: boolean;
  onChange: (next: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs font-medium text-text">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-pressed={value === option.key}
            disabled={disabled}
            onClick={() => onChange(option.key)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs transition-colors duration-150",
              value === option.key
                ? "border-brand-500 bg-brand-500/10 text-text"
                : "border-border bg-surface text-text-muted hover:text-text",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
