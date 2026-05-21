// Revenue forecast — auto-learns per-client renewal pricing from paid invoice
// history (last 12 months) and projects next-30/60/90-day revenue from
// permits expiring in those windows.
//
// We don't have a structured permit→invoice link, so the proxy is:
//
//   avgPerPermit(client) = sum(paid invoices last 12mo) / count(active permits)
//
// Falls back to the org-wide avgPerPermit when a client is too new or has no
// paid invoices yet. Each forecast entry exposes which source it used so the
// UI can mark estimates that came from the fallback.

import type { Invoice } from "@/hooks/useInvoices";
import type { Permit } from "@/hooks/usePermits";
import type { Client } from "@/hooks/useClients";

const LOOKBACK_DAYS = 365;
const MS_PER_DAY = 86_400_000;

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / MS_PER_DAY);
}

export interface PermitForecast {
  permit: Permit;
  clientName: string;
  daysUntilExpiration: number;
  estimatedRevenue: number;
  source: "client_history" | "org_average" | "no_data";
}

export interface ForecastBucket {
  windowDays: number;
  count: number;
  total: number;
  items: PermitForecast[];
}

export interface RevenueForecast {
  next30: ForecastBucket;
  next60: ForecastBucket;
  next90: ForecastBucket;
  orgAvgPerPermit: number;
}

interface ClientEconomics {
  avgPerPermit: number; // estimated annual revenue / current active permits
  hasHistory: boolean;
}

function summarizeClient(
  clientId: string,
  invoices: Invoice[],
  activePermitCount: number,
  now: Date,
): ClientEconomics {
  const cutoff = now.getTime() - LOOKBACK_DAYS * MS_PER_DAY;
  let paidTotal = 0;
  let paidCount = 0;
  for (const inv of invoices) {
    if (inv.client_id !== clientId) continue;
    if (inv.status !== "paid" || !inv.paid_date) continue;
    if (new Date(inv.paid_date).getTime() < cutoff) continue;
    paidTotal += Number(inv.amount) || 0;
    paidCount++;
  }
  if (paidCount === 0 || activePermitCount === 0) {
    return { avgPerPermit: 0, hasHistory: false };
  }
  return { avgPerPermit: paidTotal / activePermitCount, hasHistory: true };
}

function summarizeOrg(invoices: Invoice[], permits: Permit[], now: Date): number {
  const cutoff = now.getTime() - LOOKBACK_DAYS * MS_PER_DAY;
  let paidTotal = 0;
  for (const inv of invoices) {
    if (inv.status !== "paid" || !inv.paid_date) continue;
    if (new Date(inv.paid_date).getTime() < cutoff) continue;
    paidTotal += Number(inv.amount) || 0;
  }
  const activePermits = permits.filter((p) => p.status === "active").length;
  if (activePermits === 0) return 0;
  return paidTotal / activePermits;
}

export function computeRevenueForecast(
  clients: Client[],
  permits: Permit[],
  invoices: Invoice[],
  now: Date = new Date(),
): RevenueForecast {
  const clientById = new Map(clients.map((c) => [c.id, c]));

  // Active permits per client — used both for forecast and for the
  // avgPerPermit denominator.
  const activeByClient = new Map<string, Permit[]>();
  for (const p of permits) {
    if (p.status !== "active") continue;
    const arr = activeByClient.get(p.client_id) ?? [];
    arr.push(p);
    activeByClient.set(p.client_id, arr);
  }

  const orgAvg = summarizeOrg(invoices, permits, now);

  const econByClient = new Map<string, ClientEconomics>();
  for (const [clientId, list] of activeByClient) {
    econByClient.set(clientId, summarizeClient(clientId, invoices, list.length, now));
  }

  const buckets = {
    next30: { windowDays: 30, count: 0, total: 0, items: [] as PermitForecast[] },
    next60: { windowDays: 60, count: 0, total: 0, items: [] as PermitForecast[] },
    next90: { windowDays: 90, count: 0, total: 0, items: [] as PermitForecast[] },
  };

  for (const p of permits) {
    if (p.status !== "active") continue;
    if (!p.expiration_date) continue;
    const exp = new Date(p.expiration_date);
    const days = daysBetween(now, exp);
    if (days < 0 || days > 90) continue;

    const econ = econByClient.get(p.client_id) ?? { avgPerPermit: 0, hasHistory: false };
    let estimate: number;
    let source: PermitForecast["source"];
    if (econ.hasHistory) {
      estimate = econ.avgPerPermit;
      source = "client_history";
    } else if (orgAvg > 0) {
      estimate = orgAvg;
      source = "org_average";
    } else {
      estimate = 0;
      source = "no_data";
    }

    const item: PermitForecast = {
      permit: p,
      clientName: clientById.get(p.client_id)?.company_name ?? "—",
      daysUntilExpiration: days,
      estimatedRevenue: estimate,
      source,
    };

    if (days <= 30) {
      buckets.next30.items.push(item);
      buckets.next30.count++;
      buckets.next30.total += estimate;
    }
    if (days <= 60) {
      buckets.next60.items.push(item);
      buckets.next60.count++;
      buckets.next60.total += estimate;
    }
    if (days <= 90) {
      buckets.next90.items.push(item);
      buckets.next90.count++;
      buckets.next90.total += estimate;
    }
  }

  return { ...buckets, orgAvgPerPermit: orgAvg };
}
