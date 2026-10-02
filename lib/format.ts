import { enUS, sq } from "date-fns/locale";

/** Formatimi ndjek gjuhën aktive. Data dhe koha nuk mbeten kurrë shqip në anglisht. */
export function localeFor(locale: string) {
  return locale === "en" ? enUS : sq;
}

export function toDate(value: Date | string) {
  return typeof value === "string" ? new Date(value) : value;
}

/**
 * Zona kohore e platformës.
 *
 * Datat dhe orët formatohen gjithmonë në orën e Kosovës, jo në atë të makinës.
 * Serveri në Netlify është në UTC dhe shfletuesi i studentit në UTC+1 ose +2:
 * me orën e makinës, një event i orës 18:00 dilte 16:00 te serveri dhe 18:00 te
 * shfletuesi, dhe React-i e hidhte faqen poshtë me gabimin #418.
 */
export const TIME_ZONE = "Europe/Belgrade";

const PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Viti, muaji (0 deri 11), dita, ora dhe minuta, në orën e Kosovës. */
export function kosovoParts(value: Date | string) {
  const parts = Object.fromEntries(
    PARTS.formatToParts(toDate(value)).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month) - 1,
    day: Number(parts.day),
    hour: parts.hour,
    minute: parts.minute,
  };
}

/** Sa ditë kalendarike ndajnë dy data, në orën e Kosovës. */
function dayOffset(value: Date | string, now: Date = new Date()) {
  const a = kosovoParts(value);
  const b = kosovoParts(now);
  return Math.round((Date.UTC(a.year, a.month, a.day) - Date.UTC(b.year, b.month, b.day)) / 86_400_000);
}

const MONTHS_SHORT: Record<string, string[]> = {
  sq: ["jan", "shk", "mar", "pri", "maj", "qer", "kor", "gsh", "sht", "tet", "nën", "dhj"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

export function timeAgo(value: Date | string, locale = "sq") {
  const date = toDate(value);
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  const english = locale === "en";

  if (seconds < 60) return english ? "now" : "tani";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;

  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} ${english ? "h" : "orë"}`;
  }

  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400);
    return `${days} ${english ? "d" : days === 1 ? "ditë" : "ditë"}`;
  }

  return formatDateShort(date, locale);
}

export function formatDate(value: Date | string, locale = "sq") {
  const { year, month, day } = kosovoParts(value);
  const name = localeFor(locale).localize.month(month as 0, { width: "wide", context: "formatting" });
  return `${day} ${name} ${year}`;
}

export function formatDateShort(value: Date | string, locale = "sq") {
  const { month, day } = kosovoParts(value);
  return `${day} ${(MONTHS_SHORT[locale === "en" ? "en" : "sq"])[month]}`;
}

export function formatTime(value: Date | string) {
  const { hour, minute } = kosovoParts(value);
  return `${hour}:${minute}`;
}

/** Çelësi i ditës në orën e Kosovës, p.sh. «2026-9-29». Për ndarësit e ditëve te biseda. */
export function dayKey(value: Date | string) {
  const { year, month, day } = kosovoParts(value);
  return `${year}-${month + 1}-${day}`;
}

/**
 * Titulli i ditës te biseda: «Sot», «Dje», ose «27 shtator» (me vitin kur nuk
 * është ky vit). Llogaritet në server, që hidratimi të mos prishet.
 */
export function dayHeading(value: Date | string, locale = "sq", now: Date = new Date()) {
  const english = locale === "en";
  const offset = dayOffset(value, now);
  if (offset === 0) return english ? "Today" : "Sot";
  if (offset === -1) return english ? "Yesterday" : "Dje";
  const { year, month, day } = kosovoParts(value);
  const name = localeFor(locale).localize.month(month as 0, { width: "wide", context: "formatting" });
  const label = `${day} ${english ? name : name.toLowerCase()}`;
  return year === kosovoParts(now).year ? label : `${label} ${year}`;
}

export function formatDateTime(value: Date | string, locale = "sq") {
  return `${formatDate(value, locale)}, ${formatTime(value)}`;
}

/** Kthen çelësin dhe vlerat, që teksti të përkthehet te komponenti. */
export function eventDateKey(value: Date | string) {
  const date = toDate(value);
  const offset = dayOffset(date);
  if (offset === 0) return { key: "today", time: formatTime(date) } as const;
  if (offset === 1) return { key: "tomorrow", time: formatTime(date) } as const;
  if (offset === -1) return { key: "yesterday", time: formatTime(date) } as const;
  return { key: "date", time: formatTime(date) } as const;
}

export function deadlineDays(value: Date | string) {
  return Math.ceil((toDate(value).getTime() - Date.now()) / 86_400_000);
}

/** Formatimi i numrave, i pavarur nga ICU. */
export function formatNumber(value: number, locale = "sq") {
  const separator = locale === "en" ? "," : ".";
  const negative = value < 0;
  const [whole, fraction] = Math.abs(value).toString().split(".");

  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  const decimalMark = locale === "en" ? "." : ",";
  const body = fraction ? `${grouped}${decimalMark}${fraction}` : grouped;

  return negative ? `-${body}` : body;
}

const CURRENCY_SIGNS: Record<string, string> = { EUR: "€", USD: "$", GBP: "£" };

/** Po ashtu pa ICU, për te njejten arsye si te `formatNumber`. */
export function formatMoney(cents: number, currency = "EUR", locale = "sq") {
  const sign = CURRENCY_SIGNS[currency] ?? currency;
  const amount = formatNumber(Math.round(Math.abs(cents)) / 100, locale);
  const withDecimals = amount.includes(locale === "en" ? "." : ",")
    ? amount
    : `${amount}${locale === "en" ? "." : ","}00`;

  // Shqip shenja vjen pas shumes, anglisht para saj.
  const body = locale === "en" ? `${sign}${withDecimals}` : `${withDecimals} ${sign}`;
  return cents < 0 ? `-${body}` : body;
}

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
