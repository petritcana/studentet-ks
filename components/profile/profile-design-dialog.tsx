"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { saveProfileDesign } from "@/lib/actions/pro";
import {
  NAME_COLOR_PRESETS,
  PROFILE_THEMES,
  THEME_BACKGROUNDS,
  contrastRatio,
  type ProfileTheme,
} from "@/lib/pro";
import { cn } from "@/lib/utils";

/**
 * Dizajni i profilit, vetëm për Pro dhe vetëm nga profili.
 *
 * Pesë dizajne (kopertina, theksi, tinti i kartave) dhe ngjyra e emrit, e lirë:
 * çdo ngjyrë, në të dy temat. Pamja paraprake tregon si del para se të ruhet,
 * dhe kur ngjyra lexohet vështirë në njërën temë, dritarja e thotë.
 */
export function ProfileDesignDialog({
  name,
  theme: initialTheme,
  nameColor: initialColor,
}: {
  name: string;
  theme: ProfileTheme | null;
  nameColor: string | null;
}) {
  const t = useTranslations("profileDesign");
  const tAll = useTranslations();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<ProfileTheme | null>(initialTheme);
  const [color, setColor] = React.useState<string | null>(initialColor);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!open) return;
    setTheme(initialTheme);
    setColor(initialColor);
  }, [open, initialTheme, initialColor]);

  // Errësira ka dy sfonde, blunë dhe të zezën: ngjyra duhet të lexohet në të dyja.
  const weak = color
    ? (["light", "dark"] as const).filter((mode) =>
        mode === "light"
          ? contrastRatio(color, THEME_BACKGROUNDS.light) < 3
          : Math.min(contrastRatio(color, THEME_BACKGROUNDS.blue), contrastRatio(color, THEME_BACKGROUNDS.dark)) < 3,
      )
    : [];

  function save() {
    startTransition(async () => {
      const result = await saveProfileDesign({ theme, nameColor: color });
      if (!result.ok) {
        toast.error(tAll(result.messageKey ?? "common.retry"));
        return;
      }
      toast.success(t("saved"));
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip label={t("open")}>
        <DialogTrigger asChild>
          <Button variant="secondary" size="iconSm" aria-label={t("open")} data-profile-design>
            <Palette />
          </Button>
        </DialogTrigger>
      </Tooltip>

      <DialogContent className="sm:max-w-lg" data-profile-design-dialog>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("body")}</DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-5">
          {/* Pamja paraprake: kopertina e dizajnit dhe emri me ngjyrën e zgjedhur. */}
          <div data-profile-theme={theme ?? undefined} className="overflow-hidden rounded-card border border-border bg-surface">
            <div className="h-16 bg-surface-2" style={theme ? { backgroundImage: "var(--pt-cover)" } : undefined} />
            <div className="flex items-center gap-2 px-4 py-3">
              <span className="text-lg font-semibold" style={color ? { color } : undefined} data-design-preview-name>
                {name}
              </span>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-500">{t("accent")}</span>
            </div>
          </div>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-text">{t("themes")}</h3>
            <div className="grid grid-cols-3 gap-2">
              <ThemeOption label={t("none")} selected={theme === null} onSelect={() => setTheme(null)} />
              {PROFILE_THEMES.map((key) => (
                <ThemeOption key={key} theme={key} label={t(`theme_${key}`)} selected={theme === key} onSelect={() => setTheme(key)} />
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-text">{t("nameColor")}</h3>
              {color ? (
                <Button variant="ghost" size="sm" onClick={() => setColor(null)} data-name-color-reset>
                  <RotateCcw />
                  {t("resetColor")}
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {NAME_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColor(preset)}
                  aria-label={preset}
                  aria-pressed={color === preset}
                  className={cn(
                    "grid size-8 place-items-center rounded-full border-2 transition-transform duration-150 hover:scale-110",
                    color === preset ? "border-brand-500" : "border-border",
                  )}
                  style={{ backgroundColor: preset }}
                  data-name-color={preset}
                >
                  {color === preset ? <Check className="size-4 mix-blend-difference text-white" /> : null}
                </button>
              ))}
              {/* Çdo ngjyrë tjetër, me zgjedhësin e sistemit. */}
              <label className="relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-dashed border-border-strong" title={t("anyColor")}>
                <span className="sr-only">{t("anyColor")}</span>
                <Palette className="size-4 text-text-muted" aria-hidden />
                <input
                  type="color"
                  value={color ?? THEME_BACKGROUNDS.light}
                  onChange={(event) => setColor(event.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  data-name-color-picker
                />
              </label>
            </div>
            {weak.length > 0 ? (
              <p className="text-xs text-warning-text" data-name-color-warning>
                {weak.length === 2 ? t("weakBoth") : weak[0] === "light" ? t("weakLight") : t("weakDark")}
              </p>
            ) : (
              <p className="text-xs text-text-muted">{t("colorHint")}</p>
            )}
          </section>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {tAll("common.cancel")}
          </Button>
          <Button onClick={save} loading={pending} data-profile-design-save>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ThemeOption({
  theme,
  label,
  selected,
  onSelect,
}: {
  theme?: ProfileTheme;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-profile-theme={theme}
      data-theme-option={theme ?? "none"}
      className={cn(
        "flex flex-col overflow-hidden rounded-control border-2 text-left transition-colors duration-150",
        selected ? "border-brand-500" : "border-border hover:border-border-strong",
      )}
    >
      <span className="h-10 w-full bg-surface-2" style={theme ? { backgroundImage: "var(--pt-cover)" } : undefined} />
      <span className="flex items-center justify-between gap-1 px-2 py-1.5 text-xs font-semibold text-text">
        {label}
        {selected ? <Check className="size-3.5 text-brand-500" /> : null}
      </span>
    </button>
  );
}
