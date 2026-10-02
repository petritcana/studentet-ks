"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { contrastLevel, contrastRatio, passesAa } from "@/lib/contrast";
import { FACULTY_CODES, facultyStyle, facultyVars } from "@/lib/faculties";
import { COLOR_GROUPS, CONTRAST_PAIRS } from "./demo-data";
import { Demo, Meta, Row, Section } from "./primitives";
import { cn } from "@/lib/utils";

function useCssVariables(names: string[]) {
  const { resolvedTheme } = useTheme();
  const [values, setValues] = React.useState<Record<string, string>>({});
  const key = names.join(",");

  React.useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const next: Record<string, string> = {};
    for (const name of key.split(",")) {
      next[name] = styles.getPropertyValue(name).trim();
    }
    setValues(next);
  }, [resolvedTheme, key]);

  return values;
}

function Swatch({ name, note, value }: { name: string; note?: string | null; value?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface p-2.5">
      <span
        className="size-10 shrink-0 rounded-sm border border-border"
        style={{ backgroundColor: `var(${name})` }}
        aria-hidden
      />
      <span className="flex min-w-0 flex-col">
        <code className="truncate font-mono text-xs text-text">{name}</code>
        <span className="truncate text-xs text-text-muted">
          {value ? <span className="tabular">{value.toUpperCase()}</span> : null}
          {value && note ? " · " : null}
          {note}
        </span>
      </span>
    </div>
  );
}

export function SectionFoundations() {
  const t = useTranslations("designSystem");
  const tf = useTranslations("faculty");

  const tokenNames = React.useMemo(
    () => COLOR_GROUPS.flatMap((group) => group.tokens.map((token) => token.name)),
    [],
  );
  const contrastNames = React.useMemo(
    () => [
      ...new Set([
        ...CONTRAST_PAIRS.flatMap((pair) => [pair.fg, pair.bg]),
        ...FACULTY_CODES.map((code) => facultyVars(code).text),
        "--bg",
      ]),
    ],
    [],
  );

  const tokenValues = useCssVariables(tokenNames);
  const contrastValues = useCssVariables(contrastNames);

  return (
    <>
      <Section id="ngjyrat" title={t("sections.colors")} intro={t("colors.intro")}>
        {COLOR_GROUPS.map((group) => (
          <Demo key={group.titleKey} label={t(`colors.${group.titleKey}`)} bare>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.tokens.map((token) => (
                <Swatch
                  key={token.name}
                  name={token.name}
                  note={token.noteKey ? t(`colors.notes.${token.noteKey}`) : null}
                  value={tokenValues[token.name]}
                />
              ))}
            </div>
          </Demo>
        ))}

        <Demo label={t("colors.pro")}>
          <div className="flex flex-col gap-3">
            <div className="pro-gradient grid h-16 place-items-center rounded-md text-sm font-semibold uppercase tracking-[0.1em] text-pro-contrast">
              --pro-from → --pro-to
            </div>
            <Meta>
              {t("colors.notes.fill")} · --pro-from · --pro-to · --pro-contrast
            </Meta>
          </div>
        </Demo>

        <Demo label={t("colors.faculties")} note={t("colors.facultiesNote")}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {FACULTY_CODES.map((code) => (
              <div
                key={code}
                style={facultyStyle(code)}
                className="flex items-center gap-3 rounded-md border border-faculty/30 bg-faculty/10 p-3"
              >
                <span className="size-3 shrink-0 rounded-full bg-faculty" aria-hidden />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-faculty-text">
                    {tf(`${code}.short`)}
                  </span>
                  <span className="truncate text-xs text-text-muted">{tf(`${code}.name`)}</span>
                </span>
              </div>
            ))}
          </div>
        </Demo>
      </Section>

      <Section id="kontrasti" title={t("sections.contrast")} intro={t("contrast.intro")}>
        <Demo label={t("contrast.pairs")} note={t("contrast.requirement")} bare>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface scrollbar-thin">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    {t("contrast.pair")}
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    {t("contrast.ratio")}
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    {t("contrast.level")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {CONTRAST_PAIRS.map((pair) => {
                  const ratio = contrastRatio(
                    contrastValues[pair.fg] ?? "",
                    contrastValues[pair.bg] ?? "",
                  );
                  const ok = passesAa(ratio);

                  return (
                    <tr key={pair.labelKey} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2.5">
                          <span
                            className="grid size-7 shrink-0 place-items-center rounded-sm border border-border text-[11px] font-semibold"
                            style={{
                              backgroundColor: `var(${pair.bg})`,
                              color: `var(${pair.fg})`,
                            }}
                            aria-hidden
                          >
                            Aa
                          </span>
                          <span className="text-text">{t(`contrast.labels.${pair.labelKey}`)}</span>
                        </span>
                      </td>
                      <td className="tabular px-4 py-2.5 text-text">
                        {ratio ? `${ratio.toFixed(2)}:1` : ","}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                            ok
                              ? "border-success/25 bg-success/10 text-success-text"
                              : "border-danger/25 bg-danger/10 text-danger-text",
                          )}
                        >
                          {ok ? <Check className="size-3" /> : <X className="size-3" />}
                          {ratio ? contrastLevel(ratio) : ","}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Demo>

        <Demo label={t("contrast.faculties")} note={t("contrast.requirement")}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {FACULTY_CODES.map((code) => {
              const ratio = contrastRatio(
                contrastValues[facultyVars(code).text] ?? "",
                contrastValues["--bg"] ?? "",
              );
              const ok = passesAa(ratio);

              return (
                <div
                  key={code}
                  style={facultyStyle(code)}
                  className="flex items-center gap-3 rounded-md border border-border bg-surface p-2.5"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-faculty-text">
                    {tf(`${code}.short`)}
                  </span>
                  <span className="tabular text-xs text-text-muted">
                    {ratio ? `${ratio.toFixed(2)}:1` : ","}
                  </span>
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full",
                      ok ? "bg-success/15 text-success-text" : "bg-danger/15 text-danger-text",
                    )}
                  >
                    {ok ? <Check className="size-3" /> : <X className="size-3" />}
                  </span>
                </div>
              );
            })}
          </div>
        </Demo>
      </Section>

      <Section id="tipografia" title={t("sections.typography")} intro={t("typography.intro")}>
        <Demo label={t("typography.scale")} note={t("typography.scaleNote")}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Meta>text-hero · Instrument Serif</Meta>
              <p className="font-serif text-hero text-text">{t("typography.sampleHero")}</p>
            </div>
            <div className="flex flex-col gap-1">
              <Meta>text-2xl · Instrument Serif</Meta>
              <p className="font-serif text-2xl text-text">{t("typography.sampleTitle")}</p>
            </div>
            <div className="flex flex-col gap-1">
              <Meta>text-xl · Inter 600</Meta>
              <p className="text-xl font-semibold text-text">{t("typography.sampleSubtitle")}</p>
            </div>
            <div className="flex flex-col gap-1">
              <Meta>text-base · Inter 400 · 1.5</Meta>
              <p className="measure text-base text-text">{t("typography.sampleBody")}</p>
            </div>
            <div className="flex flex-col gap-1">
              <Meta>text-sm · Inter 400</Meta>
              <p className="measure text-sm text-text-muted">{t("typography.sampleMuted")}</p>
            </div>
            <div className="flex flex-col gap-1">
              <Meta>tabular · JetBrains Mono</Meta>
              <p className="tabular text-lg text-text">{t("typography.sampleNumbers")}</p>
            </div>
          </div>
        </Demo>

        <Demo label={t("typography.measure")} note={t("typography.measureNote")}>
          <div className="flex flex-col gap-3">
            <p className="measure text-sm text-text">{t("typography.measureBody")}</p>
            <p className="text-sm text-text-muted">{t("typography.measureNoteBody")}</p>
          </div>
        </Demo>
      </Section>

      <Section id="hapesira" title={t("sections.space")} intro={t("space.intro")}>
        <Demo label={t("space.scale")} note="4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96">
          <div className="flex flex-wrap items-end gap-3">
            {[1, 2, 3, 4, 6, 8, 12, 16, 24].map((step) => (
              <div key={step} className="flex flex-col items-center gap-1.5">
                <div
                  className="rounded-sm bg-brand-500/20 ring-1 ring-brand-500/30"
                  style={{ width: step * 4, height: step * 4 }}
                  aria-hidden
                />
                <Meta>{step * 4}</Meta>
              </div>
            ))}
          </div>
        </Demo>

        <Demo label={t("space.radius")} note={t("space.radiusNote")}>
          <Row>
            {[
              { cls: "rounded-sm", label: "8" },
              { cls: "rounded-md", label: "12" },
              { cls: "rounded-lg", label: "16" },
              { cls: "rounded-xl", label: "24" },
              { cls: "rounded-full", label: "999" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1.5">
                <div
                  className={cn("size-16 border border-border bg-surface-2", item.cls)}
                  aria-hidden
                />
                <Meta>{item.label}px</Meta>
              </div>
            ))}
          </Row>
        </Demo>

        <Demo label={t("space.shadows")}>
          <Row className="gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="grid h-20 w-32 place-items-center rounded-lg border border-border bg-surface text-xs text-text-muted shadow-soft">
                shadow-soft
              </div>
              <Meta>{t("space.shadowSoft")}</Meta>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="grid h-20 w-32 place-items-center rounded-lg border border-border bg-surface text-xs text-text-muted shadow-lifted">
                shadow-lifted
              </div>
              <Meta>{t("space.shadowLifted")}</Meta>
            </div>
          </Row>
        </Demo>

        <Demo label={t("space.motion")} note={t("space.motionNote")}>
          <MotionDemo />
        </Demo>
      </Section>
    </>
  );
}

function MotionDemo() {
  const t = useTranslations("designSystem.space");
  const [key, setKey] = React.useState(0);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setKey((value) => value + 1)}
        className="self-start rounded-full border border-brand-500/40 px-4 py-1.5 text-sm font-medium text-brand-500 transition-colors duration-150 ease-brand hover:bg-brand-500/10"
      >
        {t("motionReplay")}
      </button>

      <div key={key} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "150ms", delay: "0ms", note: t("micro") },
          { label: "250ms", delay: "80ms", note: t("transition") },
          { label: "400ms", delay: "160ms", note: t("large") },
        ].map((item) => (
          <div
            key={item.label}
            className="animate-rise rounded-md border border-border bg-surface-2 p-4"
            style={{ animationDelay: item.delay }}
          >
            <p className="tabular text-sm font-semibold text-text">{item.label}</p>
            <p className="text-xs text-text-muted">{item.note}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-text-muted">{t("motionBody")}</p>
    </div>
  );
}
