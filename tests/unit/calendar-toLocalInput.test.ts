import { describe, expect, it } from "vitest";
import { toLocalInput } from "@/lib/datetime";

describe("toLocalInput", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(toLocalInput(null)).toBe("");
    expect(toLocalInput(undefined)).toBe("");
    expect(toLocalInput("")).toBe("");
  });

  it("returns empty string for an invalid date", () => {
    expect(toLocalInput("not a date")).toBe("");
  });

  it("converts an ISO string to the local-tz `YYYY-MM-DDTHH:mm` format", () => {
    // 2025-06-06T14:30:00Z is 14:30 UTC. Whatever the test runner's tz is,
    // the function should produce a string that round-trips.
    const result = toLocalInput("2025-06-06T14:30:00Z");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

    // Round-trip: parse the output back and assert that the UTC components
    // match the input. (This is the property that matters for a
    // datetime-local input, which is always interpreted as local time.)
    const d = new Date(result);
    expect(d.toISOString()).toBe("2025-06-06T14:30:00.000Z");
  });

  it("accepts a Date instance", () => {
    const d = new Date(2025, 0, 15, 9, 5); // Jan 15 2025, 09:05 local
    const result = toLocalInput(d);
    expect(result).toBe("2025-01-15T09:05");
  });

  it("zero-pads single-digit months, days, hours, and minutes", () => {
    const d = new Date(2025, 2, 4, 7, 8); // Mar 4 2025, 07:08
    expect(toLocalInput(d)).toBe("2025-03-04T07:08");
  });
});
