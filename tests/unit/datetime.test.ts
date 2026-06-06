import { describe, expect, it } from "vitest";
import {
  addCalendarPeriod,
  getCalendarRange,
  toLocalInput,
} from "@/lib/datetime";

describe("toLocalInput", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(toLocalInput(null)).toBe("");
    expect(toLocalInput(undefined)).toBe("");
    expect(toLocalInput("")).toBe("");
  });

  it("returns empty string for an invalid date", () => {
    expect(toLocalInput("not a date")).toBe("");
  });

  it("round-trips an ISO string back to the same UTC instant", () => {
    const result = toLocalInput("2025-06-06T14:30:00Z");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(new Date(result).toISOString()).toBe("2025-06-06T14:30:00.000Z");
  });

  it("zero-pads single-digit months, days, hours, and minutes", () => {
    const d = new Date(2025, 2, 4, 7, 8);
    expect(toLocalInput(d)).toBe("2025-03-04T07:08");
  });
});

describe("addCalendarPeriod", () => {
  it("advances by one month without mutating the input", () => {
    const input = new Date(2026, 5, 6, 12, 30);
    const original = input.getTime();
    const result = addCalendarPeriod(input, "month", 1);
    expect(input.getTime()).toBe(original);
    expect(result.getMonth()).toBe(6); // July
    expect(result.getDate()).toBe(6);
  });

  it("advances by one week (7 days) without mutating the input", () => {
    const input = new Date(2026, 5, 6, 12, 30);
    const original = input.getTime();
    const result = addCalendarPeriod(input, "week", 1);
    expect(input.getTime()).toBe(original);
    expect(result.getDate()).toBe(13);
  });

  it("rewinds by one day in day view", () => {
    const input = new Date(2026, 5, 6);
    const result = addCalendarPeriod(input, "day", -1);
    expect(result.getDate()).toBe(5);
    expect(result.getMonth()).toBe(5);
  });

  it("rewinds by N weeks", () => {
    const input = new Date(2026, 5, 6);
    const result = addCalendarPeriod(input, "week", -2);
    expect(result.getDate()).toBe(23);
    expect(result.getMonth()).toBe(4); // May
  });
});

describe("getCalendarRange", () => {
  it("returns the start of the month and end of the month for month view", () => {
    const input = new Date(2026, 5, 15);
    const { start, end } = getCalendarRange(input, "month");
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(5);
    expect(end.getMonth()).toBe(5);
    expect(end.getDate()).toBe(30); // June has 30 days
  });

  it("returns day boundaries (00:00 → 23:59) for day view", () => {
    const input = new Date(2026, 5, 6, 12, 30);
    const original = input.getTime();
    const { start, end } = getCalendarRange(input, "day");
    expect(input.getTime()).toBe(original);
    expect(start.getHours()).toBe(0);
    expect(end.getHours()).toBe(23);
  });

  it("returns a 7-day window for week view", () => {
    const input = new Date(2026, 5, 6);
    const { start, end } = getCalendarRange(input, "week");
    const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThanOrEqual(6);
    expect(days).toBeLessThanOrEqual(7);
  });
});
