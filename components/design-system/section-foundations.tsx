"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Check, X } from "lucide-react";
import { contrastLevel, contrastRatio } from "@/lib/contrast";
import { FACULTY_KEYS, FACULTY_THEMES } from "@/lib/faculties";
import { cn } from "@/lib/utils";
import { Demo, Meta, Row, Section } from "./primitives";

const TOKEN_GROUPS: { title: string; tokens: { name: string; note?: string }[] }[] = [
  {
    title: "Marka",
    tokens: [
      { name: "--brand-500", note: "veprimi kryesor" },
      { name: "--brand-600", note: "hover" },
      { name: "--brand-50", note: "sfond i butë" },
      { name: "--accent-500", note: "përdoret rrallë" },
      { name: "--accent-50" },
    ],
  },
  {
    title: "Sipërfaqet",
    tokens: [
      { name: "--bg", note: "e ngrohtë, jo e bardhë" },
      { name: "--surface", note: "karta" },
      { name: "--surface-2", note: "e zhytur" },
      { name: "--border", note: "gjithmonë 1px" },
    ],
  },
  {
    title: "Teksti",
    tokens: [
      { name: "--text" },
      { name: "--text-muted", note: "kurrë mbi surface-2" },
    ],
  },
  {
    title: "Semantike",
    tokens: [
      { name: "--success", note: "mbushje" },
      { name: "--success-text", note: "tekst" },
      { name: "--warning" },
      { name: "--warning-text" },
      { name: "--danger" },
      { name: "--danger-text" },
    ],
  },
];

const CONTRAST_PAIRS: { fg: string; bg: string; label: string; large?: boolean }[] = [
  { fg: "--text", bg: "--bg", label: "Tekst kryesor mbi sfond" },
  { fg: "--text", bg: "--surface", label: "Tekst kryesor mbi kartë" },
  { fg: "--text-muted", bg: "--bg", label: "Tekst dytësor mbi sfond" },
  { fg: "--text-muted", bg: "--surface", label: "Tekst dytësor mbi kartë" },
  { fg: "--brand-500", bg: "--bg", label: "Lidhje marke mbi sfond" },
  { fg: "--brand-contrast", bg: "--brand-500", label: "Tekst mbi buton kryesor" },
  { fg: "--danger-text", bg: "--bg", label: "Gabim mbi sfond" },
  { fg: "--success-text", bg: "--surface", label: "Sukses mbi kartë" },
  { fg: "--warning-text", bg: "--surface", label: "Kujdes mbi kartë" },
  { fg: "--accent-text", bg: "--bg", label: "Theks mbi sfond" },
];

function useCssVariables(names: string[]) {
  const { resolvedTheme } = useTheme();
  const [values, setValues] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const next: Record<string, string> = {};
    for (const name of names) {
      next[name] = styles.getPropertyValue(name).trim();
    }
    setValues(next);
    // resolvedTheme është pjesë e varësive që auditi të rillogaritet me temën.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme, names.join(",")]);

  return values;
}

function Swatch({ name, note, value }: { name: string; note?: string; value?: string }) {
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
  const tokenNames = React.useMemo(
    () => TOKEN_GROUPS.flatMap((group) => group.tokens.map((token) => token.name)),
    [],
  );
  const contrastNames = React.useMemo(
    () => Array.from(new Set(CONTRAST_PAIRS.flatMap((pair) => [pair.fg, pair.bg]))),
    [],
  );

  const tokenValues = useCssVariables(tokenNames);
  const contrastValues = useCssVariables(contrastNames);

  return (
    <>
      <Section
        id="ngjyrat"
        title="Ngjyrat"
        intro="Një burim i vetëm i së vërtetës. Asnjë komponent nuk shkruan hex direkt. Tokenat ndërrohen me temën, utilitetet mbeten të njëjtat."
      >
        {TOKEN_GROUPS.map((group) => (
          <Demo key={group.title} label={group.title} bare>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.tokens.map((token) => (
                <Swatch
                  key={token.name}
                  name={token.name}
                  note={token.note}
                  value={tokenValues[token.name]}
                />
              ))}
            </div>
          </Demo>
        ))}

        <Demo
          label="Identiteti i fakulteteve"
          note="Ngjyra e fakultetit ndjek studentin kudo: badge, kanal, renditje."
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {FACULTY_KEYS.map((key) => {
              const theme = FACULTY_THEMES[key];
              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center gap-3 rounded-md border bg-linear-to-br p-3",
                    theme.border,
                    theme.gradient,
                  )}
                >
                  <span className={cn("size-3 shrink-0 rounded-full", theme.dot)} aria-hidden />
                  <span className="flex min-w-0 flex-col">
                    <span className={cn("truncate text-sm font-semibold", theme.text)}>
                      {theme.shortLabel}
                    </span>
                    <span className="truncate text-xs text-text-muted">{theme.label}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </Demo>
      </Section>

      <Section
        id="kontrasti"
        title="Kontrasti"
        intro="Auditi llogaritet drejtpërdrejt nga vlerat e temës aktive, jo nga tabela e shkruar me dorë. Ndërro temën lart dhe numrat ndryshojnë."
      >
        <Demo label="Çiftet kritike" note="Kërkesa: 4.5:1 për tekst të vogël" bare>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface scrollbar-thin">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Çifti
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Raporti
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Niveli
                  </th>
                </tr>
              </thead>
              <tbody>
                {CONTRAST_PAIRS.map((pair) => {
                  const fg = contrastValues[pair.fg];
                  const bg = contrastValues[pair.bg];
                  const ratio = fg && bg ? contrastRatio(fg, bg) : null;
                  const level = ratio ? contrastLevel(ratio, pair.large) : null;
                  const passes = ratio !== null && ratio >= (pair.large ? 3 : 4.5);

                  return (
                    <tr key={pair.label} className="border-b border-border last:border-0">
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
                          <span className="text-text">{pair.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="tabular text-text">
                          {ratio ? `${ratio.toFixed(2)}:1` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                            passes
                              ? "border-success/25 bg-success/10 text-success-text"
                              : "border-danger/25 bg-danger/10 text-danger-text",
                          )}
                        >
                          {passes ? <Check className="size-3" /> : <X className="size-3" />}
                          {level ?? "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Demo>
      </Section>

      <Section
        id="tipografia"
        title="Tipografia"
        intro="Inter për interfejsin, Instrument Serif për tituj që duhet të mbahen mend, JetBrains Mono për numra. Rreshti nuk kalon 68 karaktere."
      >
        <Demo label="Shkalla" note="clamp(), pa breakpoint-e">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Meta>text-hero · Instrument Serif</Meta>
              <p className="font-serif text-hero text-text">Mësim që të lidh</p>
            </div>
            <div className="flex flex-col gap-1">
              <Meta>text-2xl · Instrument Serif</Meta>
              <p className="font-serif text-2xl text-text">Lidhje që të mëson</p>
            </div>
            <div className="flex flex-col gap-1">
              <Meta>text-xl · Inter 600</Meta>
              <p className="text-xl font-semibold text-text">Materialet e lëndëve të tua</p>
            </div>
            <div className="flex flex-col gap-1">
              <Meta>text-base · Inter 400 · lartësia 1.5</Meta>
              <p className="measure text-base text-text">
                Dija e studentëve sot jeton në grupe WhatsApp dhe folderë Drive. Çdo vit kur
                ndërrohet gjenerata, ajo dije zhduket. Këtu mbetet, dhe kërkohet.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <Meta>text-sm · Inter 400</Meta>
              <p className="measure text-sm text-text-muted">
                Skripta Mikroekonomi 2024, Prof. Berisha · 84 faqe · 312 shkarkime
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <Meta>tabular · JetBrains Mono</Meta>
              <p className="tabular text-lg text-text">2.341 studentë · 12.480 materiale</p>
            </div>
          </div>
        </Demo>

        <Demo label="Gjatësia e rreshtit" note="klasa .measure = 68ch">
          <div className="flex flex-col gap-3">
            <p className="measure text-sm text-text">
              Kjo është gjatësia maksimale e lejuar. Syri e ndjek rreshtin pa u lodhur dhe e gjen
              fillimin e rreshtit tjetër pa u përpjekur. Çdo bllok teksti i gjatë në platformë e
              merr këtë kufi.
            </p>
            <p className="text-sm text-text-muted">
              Pa kufi, i njëjti paragraf shtrihet sa gjerësia e ekranit dhe në 1920px bëhet i
              palexueshëm. Kjo është arsyeja pse kolona e feed-it nuk kalon 720px.
            </p>
          </div>
        </Demo>
      </Section>

      <Section
        id="hapesira"
        title="Hapësira, rrezja, hijet"
        intro="Sistem 4px. Rrezja rritet me sipërfaqen. Hijet marrin ngjyrën e markës, kurrë të zezën."
      >
        <Demo label="Shkalla e hapësirës" note="4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96">
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

        <Demo label="Rrezja" note="8 komponentë · 16 karta · 24 modale · 999 pilula">
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
                  className={cn(
                    "size-16 border border-border bg-surface-2",
                    item.cls,
                  )}
                  aria-hidden
                />
                <Meta>{item.label}px</Meta>
              </div>
            ))}
          </Row>
        </Demo>

        <Demo label="Hijet" note="të buta, me ngjyrë brand">
          <Row className="gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="grid h-20 w-32 place-items-center rounded-lg border border-border bg-surface text-xs text-text-muted shadow-soft">
                shadow-soft
              </div>
              <Meta>qetësi</Meta>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="grid h-20 w-32 place-items-center rounded-lg border border-border bg-surface text-xs text-text-muted shadow-lifted">
                shadow-lifted
              </div>
              <Meta>hover, modale</Meta>
            </div>
          </Row>
        </Demo>

        <Demo
          label="Lëvizja"
          note="150ms mikro · 250ms tranzicion · 400ms i madh"
        >
          <MotionDemo />
        </Demo>
      </Section>
    </>
  );
}

function MotionDemo() {
  const [key, setKey] = React.useState(0);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setKey((value) => value + 1)}
        className="self-start rounded-full border border-brand-500/40 px-4 py-1.5 text-sm font-medium text-brand-500 transition-colors duration-150 ease-brand hover:bg-brand-500/10"
      >
        Luaje përsëri
      </button>
      <div key={key} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "150ms", delay: "0ms", note: "mikro-interaksion" },
          { label: "250ms", delay: "80ms", note: "tranzicion" },
          { label: "400ms", delay: "160ms", note: "element i madh" },
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
      <p className="text-xs text-text-muted">
        Zbulimi i përmbajtjes është gjithmonë fade plus 12px lart, me easing
        cubic-bezier(0.32, 0.72, 0, 1). Nëse sistemi kërkon lëvizje të reduktuar, animacionet
        fiken vetë.
      </p>
    </div>
  );
}
