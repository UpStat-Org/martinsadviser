import { describe, it, expect } from "vitest";
import { NEW_ENTRANT_REQUIREMENTS, newEntrantStatus } from "../newEntrant";

const DAY = 86_400_000;

describe("newEntrantStatus", () => {
  it("returns 'not_in_program' when there is no start date", () => {
    const r = newEntrantStatus(null);
    expect(r.state).toBe("not_in_program");
    expect(r.endsOn).toBeNull();
  });

  it("is 'active' early in the program", () => {
    const now = new Date("2026-05-01T00:00:00Z");
    const start = new Date(now.getTime() - 30 * DAY).toISOString().slice(0, 10);
    const r = newEntrantStatus(start, now);
    expect(r.state).toBe("active");
    expect(r.daysInProgram).toBe(30);
  });

  it("flips to 'audit_overdue' after 12 months without completion", () => {
    const now = new Date("2026-05-01T00:00:00Z");
    const start = new Date(now.getTime() - 400 * DAY).toISOString().slice(0, 10);
    const r = newEntrantStatus(start, now);
    expect(r.state).toBe("audit_overdue");
  });

  it("flips to 'ending_soon' inside the 60-day end window", () => {
    const now = new Date("2026-05-01T00:00:00Z");
    const start = new Date(now.getTime() - 500 * DAY).toISOString().slice(0, 10);
    const r = newEntrantStatus(start, now);
    expect(r.state).toBe("ending_soon");
  });

  it("is 'completed' once 540 days have passed", () => {
    const now = new Date("2026-05-01T00:00:00Z");
    const start = new Date(now.getTime() - 600 * DAY).toISOString().slice(0, 10);
    const r = newEntrantStatus(start, now);
    expect(r.state).toBe("completed");
    expect(r.daysUntilEnd).toBeLessThan(0);
  });

  it("exposes the seven program requirements", () => {
    expect(NEW_ENTRANT_REQUIREMENTS).toHaveLength(7);
    for (const req of NEW_ENTRANT_REQUIREMENTS) {
      expect(req.labelKey).toMatch(/^newEntrant\.req\./);
    }
  });
});
