import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Nis fjalinë me shkronjë të madhe pa e prekur pjesën tjetër. */
export function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase("sq") + value.slice(1);
}

/** "Arian Krasniqi" -> "AK". Përdoret nga avatari fallback. */
export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase("sq");
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase("sq");
}

/**
 * Hash i qëndrueshëm nga një varg. I njëjti emër jep gjithmonë të njëjtin
 * gradient avatari, në server dhe në klient.
 */
export function stableHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Numra të mëdhenj në formë të shkurtër: 12480 -> "12.480". */
export function formatNumber(value: number) {
  return new Intl.NumberFormat("sq-AL").format(value);
}

/** 2048576 -> "2 MB" */
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}
