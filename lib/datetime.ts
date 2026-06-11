/**
 * Datetime helpers shared between the server (route handlers) and
 * client (calendar page). Kept side-effect free so they're easy to
 * unit-test.
 */
import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type CalendarView = "month" | "week" | "day";

/** Convert any date-ish value into the local-tz `YYYY-MM-DDTHH:mm` string
 *  that a `<input type="datetime-local">` expects. Returns "" for
 *  empty/null/invalid values. */
export function toLocalInput(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

/**
 * Move a `date` by `amount` periods of the given view. Returns a fresh
 * `Date` — does not mutate the input.
 *
 *   addCalendarPeriod(d, "month", -1)  // previous month
 *   addCalendarPeriod(d, "week", 1)    // next week
 *   addCalendarPeriod(d, "day", 7)     // 7 days from now
 */
export function addCalendarPeriod(
  date: Date,
  view: CalendarView,
  amount: number,
): Date {
  if (view === "month") return addMonths(date, amount);
  if (view === "week") return addDays(date, amount * 7);
  return addDays(date, amount);
}

/**
 * Compute the start/end of the calendar grid for the given view.
 * Always returns fresh Date instances (never the input).
 */
export function getCalendarRange(
  date: Date,
  view: CalendarView,
): { start: Date; end: Date } {
  if (view === "month") {
    return { start: startOfMonth(date), end: endOfMonth(date) };
  }
  if (view === "week") {
    return { start: startOfWeek(date), end: endOfWeek(date) };
  }
  return { start: startOfDay(date), end: endOfDay(date) };
}
