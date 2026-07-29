import { describe, expect, it } from "vitest";

import { toMilliseconds } from "./duration.js";

describe("toMilliseconds", () => {
  it("converts the three units", () => {
    expect(toMilliseconds({ value: 30, unit: "seconds" })).toBe(30_000);
    expect(toMilliseconds({ value: 5, unit: "minutes" })).toBe(300_000);
    expect(toMilliseconds({ value: 2, unit: "hours" })).toBe(7_200_000);
  });

  it("handles zero", () => {
    expect(toMilliseconds({ value: 0, unit: "minutes" })).toBe(0);
  });

  // The schema allows a decimal, so the engine must not produce a fractional
  // millisecond: BullMQ's delay is an integer and Redis would round it anyway.
  it("rounds a fractional value to whole milliseconds", () => {
    expect(toMilliseconds({ value: 1.5, unit: "seconds" })).toBe(1500);
    expect(toMilliseconds({ value: 0.0001, unit: "seconds" })).toBe(0);
  });

  it("converts the schema's maximum without losing precision", () => {
    expect(toMilliseconds({ value: 100_000, unit: "hours" })).toBe(360_000_000_000);
  });
});
