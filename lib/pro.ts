/**
 * Zgjedhjet e Pro-s, si të dhëna.
 *
 * Rrinë jashtë veprimeve sepse një skedar `"use server"` eksporton vetëm
 * funksione asinkrone. Po ashtu i duhen edhe klientit, që butonat të ndërtohen
 * nga e njëjta listë që e zbaton serveri: dy lista do të ndaheshin nga njëra
 * tjetra në rrjedhën e parë të punës.
 */

/** Theksi i profilit premium. Vjen nga paleta e platformës, jo nga zgjedhje e lirë. */
export const PRO_ACCENTS = ["brand", "amber", "emerald", "sky", "violet", "rose"] as const;
export type ProAccentKey = (typeof PRO_ACCENTS)[number];

/** Stili i kopertinës kur studenti nuk ka ngarkuar foto të vetën. */
export const PRO_COVERS = ["gradient", "mesh", "lines"] as const;
export type ProCoverKey = (typeof PRO_COVERS)[number];

/**
 * Pesë dizajnet e profilit, vetëm për Pro. Secili është një grup tokenash te
 * `globals.css` (`[data-profile-theme]`): kopertina, theksi dhe tinti i kartave,
 * me vlera të veçanta për temën e çelët dhe të errët.
 */
export const PROFILE_THEMES = ["aurora", "sunset", "forest", "midnight", "gold"] as const;
export type ProfileTheme = (typeof PROFILE_THEMES)[number];

export function profileThemeOf(value: string | null | undefined): ProfileTheme | null {
  return (PROFILE_THEMES as readonly string[]).includes(value ?? "") ? (value as ProfileTheme) : null;
}

/**
 * Ngjyra e emrit është zgjedhje e lirë: çdo ngjyrë #rrggbb. Këto janë vetëm
 * sugjerime për një prekje të shpejtë; zgjedhësi i ngjyrave i lejon të gjitha.
 */
export const NAME_COLOR_PRESETS = [
  "#ffffff",
  "#111827",
  "#8ab8ff",
  "#5eead4",
  "#6ee7b7",
  "#fcd34d",
  "#fdba74",
  "#f9a8d4",
  "#c4b5fd",
  "#f87171",
] as const;

const HEX = /^#[0-9a-f]{6}$/i;

export function nameColorOf(value: string | null | undefined): string | null {
  return value && HEX.test(value) ? value.toLowerCase() : null;
}

/** Kontrasti WCAG mes dy ngjyrave #rrggbb, që dritarja të paralajmërojë kur emri lexohet vështirë. */
export function contrastRatio(a: string, b: string) {
  const luminance = (hex: string) => {
    const [r, g, b2] = [1, 3, 5].map((index) => {
      const channel = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b2;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Sfondet e dy temave, për kontrollin e kontrastit te dritarja e dizajnit. */
export const THEME_BACKGROUNDS = { light: "#eef2f8", blue: "#0f2451", dark: "#0b0d12" } as const;

/** Kush mund të të ndjekë. */
export const FOLLOW_AUDIENCES = ["everyone", "verified", "university", "nobody"] as const;
export type FollowAudience = (typeof FOLLOW_AUDIENCES)[number];

/** Kush mund të të shkruajë. */
export const MESSAGE_AUDIENCES = ["everyone", "friends", "university", "nobody"] as const;
export type MessageAudience = (typeof MESSAGE_AUDIENCES)[number];
