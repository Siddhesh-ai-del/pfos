// Slice 7 — ₹ formatting regressions (Indian digit grouping, tabular feel).
// Single formatter (lib/demo.ts) — every screen must match it exactly.
import { describe, expect, it } from "vitest";
import { formatINR } from "@/lib/demo";

describe("formatINR — Indian locale grouping", () => {
  it("zero, hundreds, thousands", () => {
    expect(formatINR(0)).toBe("₹0");
    expect(formatINR(1200)).toBe("₹12");
    expect(formatINR(9500)).toBe("₹95");
    expect(formatINR(11000)).toBe("₹110");
    expect(formatINR(50000)).toBe("₹500");
  });

  it("crores group as 12,34,56,789 (3 then 2s)", () => {
    expect(formatINR(456500)).toBe("₹4,565");
    expect(formatINR(265000)).toBe("₹2,650");
    expect(formatINR(140500)).toBe("₹1,405");
    expect(formatINR(410000)).toBe("₹4,100");
    expect(formatINR(1020000)).toBe("₹10,200");
    expect(formatINR(147000)).toBe("₹1,470");
    expect(formatINR(99999999)).toBe("₹9,99,999.99");
    expect(formatINR(12345678900)).toBe("₹12,34,56,789");
    expect(formatINR(123456789000)).toBe("₹1,23,45,67,890");
  });

  it("fractional rupees format to two decimal places", () => {
    expect(formatINR(12345)).toBe("₹123.45");
    expect(formatINR(100)).toBe("₹1");
    expect(formatINR(150)).toBe("₹1.50");
  });

  it("negatives render with leading minus, not trailing", () => {
    expect(formatINR(-250000)).toBe("₹-2,500");
    expect(formatINR(-12345)).toBe("₹-123.45");
  });
});
