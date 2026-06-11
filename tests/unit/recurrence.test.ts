import { describe, expect, it } from "vitest";
import { recurrenceDates } from "@/lib/recurrence";

describe("recurrenceDates", () => {
  it("creates weekly occurrences through the end date", () => {
    const dates = recurrenceDates(
      new Date("2026-01-01T10:00:00Z"),
      "weekly",
      new Date("2026-01-22T10:00:00Z"),
    );
    expect(dates.map((date) => date.toISOString())).toEqual([
      "2026-01-08T10:00:00.000Z",
      "2026-01-15T10:00:00.000Z",
      "2026-01-22T10:00:00.000Z",
    ]);
  });

  it("caps generated instances", () => {
    expect(
      recurrenceDates(
        new Date("2026-01-01T00:00:00Z"),
        "daily",
        new Date("2027-01-01T00:00:00Z"),
        10,
      ),
    ).toHaveLength(10);
  });
});
