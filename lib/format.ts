import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from "date-fns";
import { sq } from "date-fns/locale";

const MONTHS_SHORT = [
  "jan", "shk", "mar", "pri", "maj", "qer",
  "kor", "gsh", "sht", "tet", "nën", "dhj",
];

export function toDate(value: Date | string) {
  return typeof value === "string" ? new Date(value) : value;
}

/** Kompakte, për feed dhe lista: "tani", "12 min", "3 orë", "2 ditë", "14 nën". */
export function timeAgoShort(value: Date | string) {
  const date = toDate(value);
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "tani";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} orë`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} ditë`;
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

/** E plotë, për tooltip dhe faqe detajesh: "para rreth 3 orësh". */
export function timeAgoLong(value: Date | string) {
  return formatDistanceToNow(toDate(value), { addSuffix: true, locale: sq });
}

export function formatDate(value: Date | string) {
  return format(toDate(value), "d MMMM yyyy", { locale: sq });
}

export function formatDateShort(value: Date | string) {
  const date = toDate(value);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

export function formatTime(value: Date | string) {
  return format(toDate(value), "HH:mm");
}

export function formatDateTime(value: Date | string) {
  return `${formatDate(value)}, ${formatTime(value)}`;
}

/** "Sot në 16:00", "Nesër në 10:00", "E mërkurë, 14 nëntor në 16:00". */
export function formatEventDate(value: Date | string) {
  const date = toDate(value);
  if (isToday(date)) return `Sot në ${formatTime(date)}`;
  if (isTomorrow(date)) return `Nesër në ${formatTime(date)}`;
  if (isYesterday(date)) return `Dje në ${formatTime(date)}`;
  return `${format(date, "EEEE, d MMMM", { locale: sq })} në ${formatTime(date)}`;
}

/** Sa ditë mbeten deri te afati, në gjuhë njerëzore. */
export function deadlineLabel(value: Date | string) {
  const date = toDate(value);
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);

  if (days < 0) return "Afati ka kaluar";
  if (days === 0) return "Mbyllet sot";
  if (days === 1) return "Mbyllet nesër";
  if (days <= 7) return `Edhe ${days} ditë`;
  return `Deri më ${formatDateShort(date)}`;
}

export function pluralize(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}
