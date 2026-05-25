import { describe, it, expect } from "vitest";
import { computeScorecard } from "../scorecard";
import type { Client } from "@/hooks/useClients";
import type { Truck } from "@/hooks/useTrucks";
import type { Permit } from "@/hooks/usePermits";

// Helpers that build the minimum fields the scorecard reads. The hook types
// pull in DB row shapes — we only need a few keys here, so cast loosely.
function mkClient(overrides: Partial<Client> = {}): Client {
  return {
    id: "c1",
    company_name: "Acme",
    ein: null,
    dot: null,
    mc: null,
    address: null,
    service_ifta: false,
    service_ct: false,
    service_ny: false,
    service_kyu: false,
    service_nm: false,
    ...(overrides as Record<string, unknown>),
  } as unknown as Client;
}
function mkTruck(overrides: Partial<Truck> = {}): Truck {
  return {
    id: "t1",
    client_id: "c1",
    plate: "ABC-1234",
    vin: "1HGBH41JXMN109186",
    year: 2024,
    ...(overrides as Record<string, unknown>),
  } as unknown as Truck;
}
function mkPermit(overrides: Partial<Permit> = {}): Permit {
  const inOneYear = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
  return {
    id: "p1",
    client_id: "c1",
    permit_type: "IFTA",
    state: null,
    status: "active",
    expiration_date: inOneYear,
    ...(overrides as Record<string, unknown>),
  } as unknown as Permit;
}

describe("computeScorecard", () => {
  const fixedNow = new Date("2026-05-01T00:00:00Z");

  it("returns 100 when nothing requires attention", () => {
    const client = mkClient({
      ein: "12-3456789",
      dot: "1234567",
      mc: "MC-99",
      address: "1 Main St",
    });
    const r = computeScorecard(client, [], [], fixedNow);
    expect(r.score).toBe(100);
    expect(r.level).toBe("healthy");
    expect(r.issues).toEqual([]);
  });

  it("penalises missing client documents", () => {
    const r = computeScorecard(mkClient(), [], [], fixedNow);
    // No docs at all → docs scores 0, others 100. weighted: 0.4*100+0.2*100+0.2*0+0.2*100 = 80.
    expect(r.breakdown.docs).toBe(0);
    expect(r.issues.filter((i) => i.kind === "doc_missing")).toHaveLength(4);
  });

  it("flags subscribed services that lack a live permit", () => {
    const client = mkClient({
      ein: "1",
      dot: "1",
      mc: "1",
      address: "1",
      service_ifta: true,
      service_ny: true,
    });
    const r = computeScorecard(client, [], [], fixedNow);
    expect(r.breakdown.services).toBe(0);
    const uncovered = r.issues.filter((i) => i.kind === "service_uncovered");
    expect(uncovered).toHaveLength(2);
  });

  it("counts a NY-state permit toward service_ny coverage", () => {
    const client = mkClient({
      ein: "1",
      dot: "1",
      mc: "1",
      address: "1",
      service_ny: true,
    });
    const permits = [mkPermit({ permit_type: "Generic", state: "NY" })];
    const r = computeScorecard(client, [], permits, fixedNow);
    expect(r.breakdown.services).toBe(100);
  });

  it("treats expired permits separately from expiring ones", () => {
    const expired = mkPermit({
      id: "p-old",
      expiration_date: new Date(fixedNow.getTime() - 5 * 86_400_000).toISOString().slice(0, 10),
    });
    const expiring = mkPermit({
      id: "p-soon",
      expiration_date: new Date(fixedNow.getTime() + 10 * 86_400_000).toISOString().slice(0, 10),
    });
    const r = computeScorecard(mkClient({ ein: "1", dot: "1", mc: "1", address: "1" }), [], [expired, expiring], fixedNow);
    expect(r.issues.some((i) => i.kind === "permit_expired")).toBe(true);
    expect(r.issues.some((i) => i.kind === "permit_expiring")).toBe(true);
  });

  it("flags trucks missing plate/vin/year", () => {
    const r = computeScorecard(
      mkClient({ ein: "1", dot: "1", mc: "1", address: "1" }),
      [mkTruck({ plate: "" })],
      [],
      fixedNow,
    );
    expect(r.breakdown.trucks).toBe(0);
    expect(r.issues.some((i) => i.kind === "truck_incomplete")).toBe(true);
  });
});
