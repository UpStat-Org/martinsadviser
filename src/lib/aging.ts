// Accounts-Receivable aging
//
// Buckets every *unpaid* invoice (status pending/overdue) by how many days it
// is past due, both org-wide and per client. Standard 30-day ladder:
//
//   current  → not yet due (days past due <= 0)
//   d1_30    → 1–30 days late
//   d31_60   → 31–60 days late
//   d61_90   → 61–90 days late
//   d90plus  → 91+ days late
//
// Pure function — the FinancePage feeds it the rows it already loads via
// useInvoices, and translates the bucket labels itself.

export interface AgingInvoice {
  client_id: string;
  amount: number | string;
  due_date: string; // YYYY-MM-DD
  status: string;
  clients?: { company_name: string } | null;
}

export type AgingBucket = "current" | "d1_30" | "d31_60" | "d61_90" | "d90plus";

export interface AgingBuckets {
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90plus: number;
  total: number;
}

export interface AgingClientRow extends AgingBuckets {
  clientId: string;
  name: string;
}

export interface AgingReport {
  totals: AgingBuckets;
  byClient: AgingClientRow[];
}

const UNPAID = new Set(["pending", "overdue"]);
const DAY_MS = 86_400_000;

function emptyBuckets(): AgingBuckets {
  return { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 };
}

export function daysPastDue(dueDate: string, asOf: Date): number {
  const due = new Date(dueDate).getTime();
  const ref = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate());
  return Math.floor((ref - due) / DAY_MS);
}

export function bucketForDays(days: number): AgingBucket {
  if (days <= 0) return "current";
  if (days <= 30) return "d1_30";
  if (days <= 60) return "d31_60";
  if (days <= 90) return "d61_90";
  return "d90plus";
}

export function computeAging(invoices: AgingInvoice[], asOf: Date = new Date()): AgingReport {
  const totals = emptyBuckets();
  const byClient = new Map<string, AgingClientRow>();

  for (const inv of invoices) {
    if (!UNPAID.has(inv.status)) continue;
    const amount = Number(inv.amount) || 0;
    const bucket = bucketForDays(daysPastDue(inv.due_date, asOf));

    totals[bucket] += amount;
    totals.total += amount;

    let row = byClient.get(inv.client_id);
    if (!row) {
      row = { clientId: inv.client_id, name: inv.clients?.company_name || "—", ...emptyBuckets() };
      byClient.set(inv.client_id, row);
    }
    row[bucket] += amount;
    row.total += amount;
  }

  const rows = [...byClient.values()].sort((a, b) => b.total - a.total);
  return { totals, byClient: rows };
}
