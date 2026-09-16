import { describe, expect, it } from "vitest";
import {
  checklistProgress,
  formatServiceOrderNumber,
  isServiceOrderOverdue,
  serviceOrderFinancials,
} from "../serviceOrders";

describe("service orders", () => {
  it("formats the human-facing order number", () => {
    expect(formatServiceOrderNumber(42)).toBe("OS-00042");
  });

  it("only treats open past-due orders as overdue", () => {
    const now = new Date("2026-09-16T12:00:00Z");
    expect(isServiceOrderOverdue({ due_date: "2026-09-15", status: "preparing" }, now)).toBe(true);
    expect(isServiceOrderOverdue({ due_date: "2026-09-15", status: "delivered" }, now)).toBe(false);
    expect(isServiceOrderOverdue({ due_date: "2026-09-17", status: "requested" }, now)).toBe(false);
  });

  it("calculates required-document progress", () => {
    expect(checklistProgress([
      { required: true, status: "approved" },
      { required: true, status: "received" },
      { required: false, status: "pending" },
      { required: true, status: "not_applicable" },
    ])).toEqual({ complete: 1, total: 2, percentage: 50 });
  });

  it("combines labor and external costs", () => {
    expect(serviceOrderFinancials({
      quotedAmount: 500,
      externalCost: 75,
      minutes: 120,
      hourlyRate: 50,
    })).toEqual({ laborCost: 100, totalCost: 175, margin: 325 });
  });
});
