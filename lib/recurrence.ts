export type RecurrenceRule = "daily" | "weekly" | "monthly";

export function recurrenceDates(
  start: Date,
  rule?: RecurrenceRule | null,
  end?: Date | null,
  limit = 52,
) {
  if (!rule || !end || end <= start) return [];
  const dates: Date[] = [];
  let next = new Date(start);
  while (dates.length < limit) {
    next = new Date(next);
    if (rule === "daily") next.setDate(next.getDate() + 1);
    if (rule === "weekly") next.setDate(next.getDate() + 7);
    if (rule === "monthly") next.setMonth(next.getMonth() + 1);
    if (next > end) break;
    dates.push(new Date(next));
  }
  return dates;
}
