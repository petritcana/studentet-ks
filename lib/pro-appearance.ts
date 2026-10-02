import type { CSSProperties } from "react";
import { PRO_ACCENTS, PRO_COVERS, type ProAccentKey, type ProCoverKey } from "@/lib/pro";

/**
 * Pamja premium e profilit.
 *
 * E ndërtuar si ngjyrat e fakulteteve: tokena te `globals.css` dhe dy variabla
 * që vendosen me `style`. Kjo është e vetmja rrugë që punon, sepse Tailwind i
 * gjeneron klasat nga teksti që sheh te burimi: një emër klase i bashkuar me
 * varg në kohë ekzekutimi nuk ekziston kurrë te fleta e stileve, dhe pikërisht
 * prandaj theksi nuk dukej fare.
 */
function accentOf(value: string | null | undefined): ProAccentKey {
  return (PRO_ACCENTS as readonly string[]).includes(value ?? "")
    ? (value as ProAccentKey)
    : "brand";
}

function coverOf(value: string | null | undefined): ProCoverKey {
  return (PRO_COVERS as readonly string[]).includes(value ?? "")
    ? (value as ProCoverKey)
    : "gradient";
}

/** Vendos `--pro-accent-fill` dhe `--pro-accent-text` për një degë të pemës. */
export function proAccentStyle(accent: string | null | undefined): CSSProperties {
  const key = accentOf(accent);
  return {
    ["--pro-accent-fill" as string]: `var(--p-${key})`,
    ["--pro-accent-text" as string]: `var(--p-${key}-text)`,
  };
}

/**
 * Kopertina kur studenti nuk ka ngarkuar foto të vetën.
 *
 * Tri stile, të gjitha mbi të njëjtin theks: kalim ngjyrash, rrjetë pikash dhe
 * vija të pjerrëta. Ngjyra vjen nga variabli, prandaj e ndjek zgjedhjen.
 */
export function coverStyle(
  accent: string | null | undefined,
  cover: string | null | undefined,
): CSSProperties {
  const base = proAccentStyle(accent);
  const fill = "var(--pro-accent-fill)";

  const backgrounds: Record<ProCoverKey, string> = {
    gradient: `linear-gradient(100deg, color-mix(in oklab, ${fill} 45%, transparent), color-mix(in oklab, ${fill} 12%, transparent) 60%, transparent)`,
    mesh: [
      `radial-gradient(circle at 18% 25%, color-mix(in oklab, ${fill} 40%, transparent), transparent 55%)`,
      `radial-gradient(circle at 78% 65%, color-mix(in oklab, ${fill} 28%, transparent), transparent 50%)`,
    ].join(", "),
    lines: `repeating-linear-gradient(135deg, color-mix(in oklab, ${fill} 22%, transparent) 0 2px, transparent 2px 12px)`,
  };

  return { ...base, backgroundImage: backgrounds[coverOf(cover)] };
}
