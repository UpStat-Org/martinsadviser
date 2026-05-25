import { describe, it, expect } from "vitest";
import { computeRevenueForecast } from "../revenueForecast";
import type { Client } from "@/hooks/useClients";
import type { Permit } from "@/hooks/usePermits";
import type { Invoice } from "@/hooks/useInvoices";

const DAY = 86_400_000;

function mkClient(id: string, overrides: Partial<Client> = {}): Client {
  return { id, company_name: `Client ${id}`, ...(overrides as Record<string, unknown>) } as unknown as Client;
}
function mkPermit(id: string, client_id: string, daysOut: number, status: Permit["status"] = "active"): Permit {
  const exp = new Date(Date.now() + daysOut * DAY).toISOString().slice(0, 10);
  return { id, client_id, permit_type: "IFTA", state: null, status, expiration_date: exp } as unknown as Permit;
}
function mkInvoice(client_id: string, amount: number, paidDaysAgo: number, status: Invoice["status"] = "paid"): Invoice {
  const paid = new Date(Date.now() - paidDaysAgo * DAY).toISOString().slice(0, 10);
  return {
    id: `i-${client_id}-${paidDaysAgo}`,
    user_id: "u",
    client_id,
    amount,
    status,
    due_date: paid,
    paid_date: paid,
    description: null,
    created_at: paid,
    updated_at: paid,
  };
}

describe("computeRevenueForecast", () => {
  it("returns empty buckets when there's nothing to project", () => {
    const f = computeRevenueForecast([], [], []);
    expect(f.next30.count).toBe(0);
    expect(f.next60.count).toBe(0);
    expect(f.next90.count).toBe(0);
    expect(f.orgAvgPerPermit).toBe(0);
  });

  it("buckets permits cumulatively (60 ⊇ 30, 90 ⊇ 60)", () => {
    const clients = [mkClient("c1")];
    const permits = [
      mkPermit("p1", "c1", 15),
      mkPermit("p2", "c1", 45),
      mkPermit("p3", "c1", 80),
    ];
    const f = computeRevenueForecast(clients, permits, []);
    expect(f.next30.count).toBe(1);
    expect(f.next60.count).toBe(2);
    expect(f.next90.count).toBe(3);
  });

  it("prefers per-client history over org average when available", () => {
    const clients = [mkClient("c1"), mkClient("c2")];
    const permits = [
      mkPermit("p1", "c1", 10),
      mkPermit("p2", "c2", 20),
    ];
    // c1 has paid history → avg = 800/1 = 800. c2 has none → falls back to org avg.
    // orgAvg = (800)/2 active permits = 400.
    const invoices = [mkInvoice("c1", 800, 30)];
    const f = computeRevenueForecast(clients, permits, invoices);

    const c1Item = f.next30.items.find((i) => i.permit.client_id === "c1")!;
    const c2Item = f.next30.items.find((i) => i.permit.client_id === "c2")!;
    expect(c1Item.source).toBe("client_history");
    expect(c1Item.estimatedRevenue).toBe(800);
    expect(c2Item.source).toBe("org_average");
    expect(c2Item.estimatedRevenue).toBe(400);
    expect(f.orgAvgPerPermit).toBe(400);
  });

  it("ignores expired permits and permits more than 90 days out", () => {
    const clients = [mkClient("c1")];
    const permits = [
      mkPermit("p_expired", "c1", -5),
      mkPermit("p_far", "c1", 120),
    ];
    const f = computeRevenueForecast(clients, permits, []);
    expect(f.next30.count).toBe(0);
    expect(f.next90.count).toBe(0);
  });

  it("ignores invoices outside the 365-day lookback window", () => {
    const clients = [mkClient("c1")];
    const permits = [mkPermit("p1", "c1", 20)];
    // Old invoices shouldn't contribute to the client's avg.
    const invoices = [mkInvoice("c1", 5000, 400)];
    const f = computeRevenueForecast(clients, permits, invoices);
    const c1Item = f.next30.items[0];
    expect(c1Item.source).not.toBe("client_history");
  });
});
