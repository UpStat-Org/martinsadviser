import { describe, it, expect } from "vitest";
import { quarterFromDate, summarizeIfta } from "../ifta";

describe("quarterFromDate", () => {
  it("buckets a date into the right quarter tag", () => {
    expect(quarterFromDate(new Date("2026-01-15"))).toBe("2026-Q1");
    expect(quarterFromDate(new Date("2026-04-01"))).toBe("2026-Q2");
    expect(quarterFromDate(new Date("2026-08-20"))).toBe("2026-Q3");
    expect(quarterFromDate(new Date("2026-12-31"))).toBe("2026-Q4");
  });

  it("accepts ISO strings", () => {
    expect(quarterFromDate("2027-07-04")).toBe("2027-Q3");
  });
});

describe("summarizeIfta", () => {
  it("returns zeros for empty input", () => {
    const r = summarizeIfta([], [], []);
    expect(r.total_miles).toBe(0);
    expect(r.total_gallons).toBe(0);
    expect(r.fleet_mpg).toBe(0);
    expect(r.by_jurisdiction).toEqual([]);
    expect(r.total_net_tax).toBe(0);
  });

  it("computes fleet MPG, per-jurisdiction taxable gallons, and balance due", () => {
    // 1000 miles, 500 in TX, 500 in OK. 100 gallons total, all bought in TX
    // at $0.20/gal. OK rate $0.30/gal. MPG = 10. Taxable gallons = 50 each.
    // TX owe = 50*0.20 = 10, paid 100*0.20 = 20 → net -10 (credit).
    // OK owe = 50*0.30 = 15, paid 0 → net 15.
    // Total balance = 5.
    const r = summarizeIfta(
      [{ total_miles: 1000, miles_by_jurisdiction: { TX: 500, OK: 500 } }],
      [{ jurisdiction: "TX", gallons: 100 }],
      [
        { jurisdiction: "TX", rate_per_gallon: 0.2 },
        { jurisdiction: "OK", rate_per_gallon: 0.3 },
      ],
    );
    expect(r.total_miles).toBe(1000);
    expect(r.total_gallons).toBe(100);
    expect(r.fleet_mpg).toBe(10);
    expect(r.by_jurisdiction).toHaveLength(2);

    const ok = r.by_jurisdiction.find((j) => j.jurisdiction === "OK")!;
    const tx = r.by_jurisdiction.find((j) => j.jurisdiction === "TX")!;
    expect(ok.taxable_gallons).toBe(50);
    expect(ok.net).toBeCloseTo(15);
    expect(tx.taxable_gallons).toBe(50);
    expect(tx.net).toBeCloseTo(-10);
    expect(r.total_net_tax).toBeCloseTo(5);
  });

  it("normalizes jurisdiction codes to uppercase and merges aliases", () => {
    const r = summarizeIfta(
      [
        { total_miles: 200, miles_by_jurisdiction: { tx: 100, TX: 100 } },
      ],
      [{ jurisdiction: "tx", gallons: 20 }],
      [{ jurisdiction: "TX", rate_per_gallon: 0.25 }],
    );
    expect(r.by_jurisdiction).toHaveLength(1);
    expect(r.by_jurisdiction[0].taxable_miles).toBe(200);
  });

  it("emits zero taxable_gallons when MPG can't be computed", () => {
    const r = summarizeIfta(
      [{ total_miles: 1000, miles_by_jurisdiction: { TX: 1000 } }],
      [],
      [{ jurisdiction: "TX", rate_per_gallon: 0.2 }],
    );
    expect(r.fleet_mpg).toBe(0);
    expect(r.by_jurisdiction[0].taxable_gallons).toBe(0);
  });
});
