import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { it } from 'date-fns/locale';
import type { FrequencyType, Weekday } from '../types';

/** Restituisce la data come stringa YYYY-MM-DD nel fuso locale */
export function toISODate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(s: string): Date {
  return parseISO(s);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function formatLong(d: Date | string): string {
  const date = typeof d === 'string' ? fromISODate(d) : d;
  return format(date, "EEEE d MMMM yyyy", { locale: it });
}

export function formatShort(d: Date | string): string {
  const date = typeof d === 'string' ? fromISODate(d) : d;
  return format(date, 'd MMM', { locale: it });
}

export function weekdayOf(d: Date | string): Weekday {
  const date = typeof d === 'string' ? fromISODate(d) : d;
  return date.getDay() as Weekday;
}

export function getWeekRange(d: Date = new Date()): { start: Date; end: Date } {
  return {
    start: startOfWeek(d, { weekStartsOn: 1 }), // lunedì
    end: endOfWeek(d, { weekStartsOn: 1 }),
  };
}

export function getMonthRange(d: Date = new Date()): { start: Date; end: Date } {
  return { start: startOfMonth(d), end: endOfMonth(d) };
}

export function daysBetween(start: Date, end: Date): string[] {
  const days: string[] = [];
  const total = differenceInCalendarDays(end, start);
  for (let i = 0; i <= total; i++) {
    days.push(toISODate(addDays(start, i)));
  }
  return days;
}

/** Restituisce true se quel giorno il subtask è "atteso" secondo la sua frequenza */
export function isExpectedOn(frequency: FrequencyType, dateISO: string): boolean {
  if (frequency.kind === 'daily') return true;
  if (frequency.kind === 'weekdays') {
    return frequency.days.includes(weekdayOf(dateISO));
  }
  // 'times-per-week' non vincola un giorno specifico
  return true;
}

export const ITALIAN_WEEKDAYS_SHORT = [
  'Dom',
  'Lun',
  'Mar',
  'Mer',
  'Gio',
  'Ven',
  'Sab',
] as const;

export const ITALIAN_WEEKDAYS_FULL = [
  'Domenica',
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato',
] as const;

/** Ordine settimanale lun-dom per l'editor delle frequenze */
export const WEEKDAY_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];
