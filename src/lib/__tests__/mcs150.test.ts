import { describe, it, expect } from "vitest";
import { mcs150Status } from "../mcs150";

// USDOT 1234567 → last digit 7 (filing month: Jul), prev digit 6 (even → even years).
// USDOT 1234568 → last digit 8 (filing month: Aug), prev digit 6 (even → even years).
// USDOT 1234561 → last digit 1 (filing month: Jan), prev digit 6 (even → even years).
// USDOT 1234571 → last digit 1 (filing month: Jan), prev digit 7 (odd → odd years).

describe("mcs150Status", () => {
  it("returns 'unknown' for missing DOT and no last-filed date", () => {
    const r = mcs150Status(null, null, new Date("2026-05-01"));
    expect(r.state).toBe("unknown");
    expect(r.nextDueOn).toBeNull();
  });

  it("returns 'unknown' for malformed DOT", () => {
    const r = mcs150Status("abc", null, new Date("2026-05-01"));
    expect(r.state).toBe("unknown");
  });

  it("projects the next due date 24 months after a recorded filing", () => {
    const r = mcs150Status("1234567", "2025-03-15", new Date("2026-01-01"));
    expect(r.nextDueOn).toBe("2027-03-15");
    expect(r.state).toBe("ok");
  });

  it("schedules off the DOT when no last-filed date is available", () => {
    // DOT ending in 7 + even prev digit → July, even years. As of Jan 2026 the
    // next filing is end-of-July 2026.
    const r = mcs150Status("1234567", null, new Date("2026-01-01"));
    expect(r.nextDueOn).toBe("2026-07-31");
    expect(r.state).toBe("ok");
  });

  it("flips to 'due_soon' inside the 90-day window", () => {
    // 60 days before the Jul 31 2026 deadline.
    const r = mcs150Status("1234567", null, new Date("2026-06-01"));
    expect(r.state).toBe("due_soon");
    expect(r.daysUntilDue).toBeGreaterThan(0);
    expect(r.daysUntilDue).toBeLessThanOrEqual(90);
  });

  it("surfaces 'overdue' when the filing month has passed and no new filing was recorded — regression for the silent roll-forward bug", () => {
    // DOT schedule: end-of-July 2026. Today is one day after.
    const r = mcs150Status("1234567", null, new Date("2026-08-01"));
    expect(r.state).toBe("overdue");
    expect(r.daysUntilDue).toBeLessThan(0);
    expect(r.nextDueOn).toBe("2026-07-31");
  });

  it("keeps surfacing overdue mid-way through the next year, then rolls forward to the next cycle once the prior deadline is more than ~12 months stale", () => {
    // 8 months past the Jul 31 2026 deadline — still overdue against that cycle.
    const stillOverdue = mcs150Status("1234567", null, new Date("2027-04-01"));
    expect(stillOverdue.state).toBe("overdue");
    expect(stillOverdue.nextDueOn).toBe("2026-07-31");

    // > 12 months past the cycle → roll forward to the next even-year July.
    const rolled = mcs150Status("1234567", null, new Date("2027-09-01"));
    expect(rolled.nextDueOn).toBe("2028-07-31");
  });

  it("respects the odd-year branch of the schedule", () => {
    // last=1 → Jan, prev=7 → odd years. From early 2026 (even), next is Jan 2027.
    const r = mcs150Status("1234571", null, new Date("2026-03-01"));
    expect(r.nextDueOn).toBe("2027-01-31");
    expect(r.state).toBe("ok");
  });
});
