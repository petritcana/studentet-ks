import { unstable_cache } from "next/cache";

/**
 * Kujtesa e shkurtër për të dhëna që nuk janë personale.
 *
 * Në prodhim serveri rri në një rajon dhe baza në një tjetër, prandaj çdo pyetje
 * kushton më shumë se sa duket. Njoftimet, reklamat dhe shpalljet e punës janë
 * të njëjta për shumë studentë brenda një minute, prandaj merren një herë dhe
 * u shërbehen të tjerëve nga kujtesa. Asgjë personale nuk hyn këtu.
 */
export const CACHE_TAGS = {
  announcements: "njoftimet",
  ads: "reklamat",
  jobs: "punet",
  weekly: "javore",
} as const;

export function cachedBy<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  keyParts: string[],
  options: { revalidate: number; tags?: string[] },
) {
  return unstable_cache(fn, keyParts, { revalidate: options.revalidate, tags: options.tags });
}
