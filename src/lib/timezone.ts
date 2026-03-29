// src/lib/timezone.ts
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';

const ARGENTINA_TZ = 'America/Argentina/Buenos_Aires';

/**
 * Returns the current date-time in Argentina timezone (UTC-3).
 * Use this as the source for all timestamp values written to the database.
 * Backend is the exclusive authority for timezone normalization (SRS Section 2.5).
 */
export function nowArgentina(): Date {
  return toZonedTime(new Date(), ARGENTINA_TZ);
}

/**
 * Converts any UTC Date to its Argentina local equivalent.
 */
export function toArgentina(date: Date): Date {
  return toZonedTime(date, ARGENTINA_TZ);
}

/**
 * Converts an Argentina local Date back to UTC for storage.
 */
export function fromArgentina(date: Date): Date {
  return fromZonedTime(date, ARGENTINA_TZ);
}

/**
 * Formats a Date as a human-readable Argentina datetime string.
 * Example output: "24/03/2026 14:30"
 */
export function formatArgentina(date: Date, pattern = 'dd/MM/yyyy HH:mm'): string {
  return format(toZonedTime(date, ARGENTINA_TZ), pattern, {
    timeZone: ARGENTINA_TZ,
  });
}