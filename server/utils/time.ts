import { format, toZonedTime, fromZonedTime } from "date-fns-tz";

const TORONTO_TZ = "America/Toronto";

export function nowToronto(): Date {
  return toZonedTime(new Date(), TORONTO_TZ);
}

export function toToronto(date: Date | string | number): Date {
  return toZonedTime(new Date(date), TORONTO_TZ);
}

export function formatToronto(date: Date | string | number, fmt = "yyyy-MM-dd HH:mm"): string {
  const d = new Date(date);
  return format(toZonedTime(d, TORONTO_TZ), fmt, { timeZone: TORONTO_TZ });
}

export function formatTorontoFull(date: Date | string | number): string {
  return formatToronto(date, "yyyy-MM-dd HH:mm:ss zzz");
}

export function formatTorontoDate(date: Date | string | number): string {
  return formatToronto(date, "yyyy-MM-dd");
}

export function formatTorontoTime(date: Date | string | number): string {
  return formatToronto(date, "HH:mm");
}

export function formatTorontoHuman(date: Date | string | number): string {
  return formatToronto(date, "MMMM d, yyyy 'at' h:mm a");
}

export function torontoToUtc(torontoDate: Date | string): Date {
  return fromZonedTime(new Date(torontoDate), TORONTO_TZ);
}

export { TORONTO_TZ };
