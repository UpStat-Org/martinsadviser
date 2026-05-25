import { describe, it, expect } from "vitest";
import { computeHvutTax, currentTaxYear, filingDeadlineFor } from "../hvut";

describe("computeHvutTax", () => {
  it("returns 0 for suspended vehicles regardless of weight", () => {
    expect(computeHvutTax(80_000, true)).toBe(0);
  });

  it("returns 0 below the 55,000 lb floor", () => {
    expect(computeHvutTax(54_999, false)).toBe(0);
    expect(computeHvutTax(0, false)).toBe(0);
    expect(computeHvutTax(null, false)).toBe(0);
  });

  it("charges the flat $100 at exactly 55,000 lbs", () => {
    expect(computeHvutTax(55_000, false)).toBe(100);
  });

  it("steps up by $22 per 1,000 lb bracket above 55K", () => {
    expect(computeHvutTax(55_001, false)).toBe(122);
    expect(computeHvutTax(56_000, false)).toBe(122);
    expect(computeHvutTax(56_001, false)).toBe(144);
    expect(computeHvutTax(75_000, false)).toBe(540);
  });

  it("caps at $550 above 75,000 lbs", () => {
    expect(computeHvutTax(75_001, false)).toBe(550);
    expect(computeHvutTax(120_000, false)).toBe(550);
  });
});

describe("currentTaxYear", () => {
  it("counts July as the start of a new tax year", () => {
    expect(currentTaxYear(new Date("2026-07-01"))).toBe(2026);
  });

  it("counts June as the prior tax year", () => {
    expect(currentTaxYear(new Date("2026-06-30"))).toBe(2025);
  });
});

describe("filingDeadlineFor", () => {
  it("returns the last day of the month after first use", () => {
    expect(filingDeadlineFor("2026-07")).toBe("2026-08-31");
    expect(filingDeadlineFor("2026-01")).toBe("2026-02-28");
  });

  it("rolls into the next year when first use is in December", () => {
    expect(filingDeadlineFor("2026-12")).toBe("2027-01-31");
  });
});
