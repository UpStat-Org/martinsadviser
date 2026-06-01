import { describe, it, expect } from "vitest";
import { computeAging, bucketForDays, daysPastDue, type AgingInvoice } from "../aging";

const ASOF = new Date(Date.UTC(2026, 5, 1)); // 2026-06-01

function inv(client_id: string, amount: number, dueDaysAgo: number, status = "pending", name?: string): AgingInvoice {
  const due = new Date(ASOF.getTime() - dueDaysAgo * 86_400_000).toISOString().slice(0, 10);
  return { client_id, amount, due_date: due, status, clients: name ? { company_name: name } : null };
}

describe("bucketForDays", () => {
  it("classifies the ladder boundaries", () => {
    expect(bucketForDays(-5)).toBe("current");
    expect(bucketForDays(0)).toBe("current");
    expect(bucketForDays(1)).toBe("d1_30");
    expect(bucketForDays(30)).toBe("d1_30");
    expect(bucketForDays(31)).toBe("d31_60");
    expect(bucketForDays(60)).toBe("d31_60");
    expect(bucketForDays(61)).toBe("d61_90");
    expect(bucketForDays(90)).toBe("d61_90");
    expect(bucketForDays(91)).toBe("d90plus");
  });
});

describe("daysPastDue", () => {
  it("is positive when overdue and non-positive when not yet due", () => {
    expect(daysPastDue("2026-05-22", ASOF)).toBe(10);
    expect(daysPastDue("2026-06-01", ASOF)).toBe(0);
    expect(daysPastDue("2026-06-15", ASOF)).toBe(-14);
  });
});

describe("computeAging", () => {
  it("excludes paid and cancelled invoices", () => {
    const r = computeAging(
      [inv("c1", 100, 10, "paid"), inv("c1", 200, 10, "cancelled"), inv("c1", 50, 10, "pending")],
      ASOF,
    );
    expect(r.totals.total).toBe(50);
    expect(r.totals.d1_30).toBe(50);
  });

  it("buckets across the ladder and tracks per-client totals", () => {
    const r = computeAging(
      [
        inv("c1", 100, -5, "pending", "Alpha"), // not yet due → current
        inv("c1", 200, 10, "overdue", "Alpha"), // d1_30
        inv("c2", 300, 45, "overdue", "Bravo"), // d31_60
        inv("c2", 400, 120, "pending", "Bravo"), // d90plus
      ],
      ASOF,
    );
    expect(r.totals).toEqual({
      current: 100,
      d1_30: 200,
      d31_60: 300,
      d61_90: 0,
      d90plus: 400,
      total: 1000,
    });
    // Sorted by total desc → Bravo (700) before Alpha (300).
    expect(r.byClient.map((c) => c.name)).toEqual(["Bravo", "Alpha"]);
    expect(r.byClient[0]).toMatchObject({ d31_60: 300, d90plus: 400, total: 700 });
    expect(r.byClient[1]).toMatchObject({ current: 100, d1_30: 200, total: 300 });
  });

  it("coerces string amounts and falls back to dash for missing client name", () => {
    const r = computeAging([{ client_id: "c9", amount: "150.50", due_date: "2026-05-01", status: "overdue" }], ASOF);
    expect(r.totals.total).toBeCloseTo(150.5);
    expect(r.byClient[0].name).toBe("—");
  });
});
