// Compliance scorecard
//
// Computes a 0-100 health score per client across four weighted dimensions:
//
//   40% — every contracted service has at least one active, non-expired permit
//         covering it
//   20% — every truck has plate + VIN + year filled
//   20% — client master data has EIN, DOT, MC, address filled
//   20% — no permit is expired or expiring within the next 30 days
//
// `service_automatic` on clients is an auto-renew preference flag, not a
// service we deliver a permit for, so it's excluded from the services check.
//
// Pure function — UI components feed it data from the existing useClient /
// useTrucks / usePermits hooks and translate the structured `issues` array.

import type { Client } from "@/hooks/useClients";
import type { Truck } from "@/hooks/useTrucks";
import type { Permit } from "@/hooks/usePermits";

export type ServiceFlag = "service_ifta" | "service_ct" | "service_ny" | "service_kyu" | "service_nm";

interface ServiceMatcher {
  flag: ServiceFlag;
  label: string;
  match: (p: Permit) => boolean;
}

// Each service flag on `clients` maps to whatever permit(s) "cover" it. CT/NY/
// KYU/NM live in the `state` field of the permit row (since PERMIT_TYPES is a
// generic list — IRP/IFTA/UCR/etc — and the state-tax permits don't have a
// dedicated type). IFTA is the one type that maps 1:1.
const SERVICES: ServiceMatcher[] = [
  { flag: "service_ifta", label: "IFTA", match: (p) => p.permit_type === "IFTA" },
  { flag: "service_ct", label: "CT", match: (p) => /^(ct|connecticut)$/i.test(p.state ?? "") },
  { flag: "service_ny", label: "NY", match: (p) => /^(ny|new york)$/i.test(p.state ?? "") },
  {
    flag: "service_kyu",
    label: "KYU",
    match: (p) => /^(ky|kentucky|kyu)$/i.test(p.state ?? "") || /kyu/i.test(p.permit_type),
  },
  { flag: "service_nm", label: "NM", match: (p) => /^(nm|new mexico)$/i.test(p.state ?? "") },
];

const DOC_FIELDS: Array<{ key: "ein" | "dot" | "mc" | "address"; label: string }> = [
  { key: "ein", label: "EIN" },
  { key: "dot", label: "DOT" },
  { key: "mc", label: "MC" },
  { key: "address", label: "address" },
];

const EXPIRING_WINDOW_DAYS = 30;

function daysUntil(dateStr: string | null, asOf: Date): number {
  if (!dateStr) return Infinity;
  const ms = new Date(dateStr).getTime() - asOf.getTime();
  return Math.ceil(ms / 86_400_000);
}

function isLivePermit(p: Permit, asOf: Date): boolean {
  if (p.status !== "active") return false;
  return daysUntil(p.expiration_date, asOf) > 0;
}

export type ScorecardLevel = "critical" | "warning" | "healthy";

export interface ScorecardBreakdown {
  services: number;
  trucks: number;
  docs: number;
  expiration: number;
}

export type ScorecardIssue =
  | { kind: "service_uncovered"; service: string }
  | { kind: "truck_incomplete"; count: number }
  | { kind: "doc_missing"; field: string }
  | { kind: "permit_expired"; count: number }
  | { kind: "permit_expiring"; count: number };

export interface ScorecardResult {
  score: number;
  level: ScorecardLevel;
  breakdown: ScorecardBreakdown;
  issues: ScorecardIssue[];
}

export function computeScorecard(
  client: Client,
  trucks: Truck[],
  permits: Permit[],
  now: Date = new Date(),
): ScorecardResult {
  const issues: ScorecardIssue[] = [];

  // ── Services (40%) ──────────────────────────────────────────────────────────
  const subscribed = SERVICES.filter((s) => client[s.flag] === true);
  let servicesScore = 100;
  if (subscribed.length > 0) {
    let covered = 0;
    for (const s of subscribed) {
      const has = permits.some((p) => isLivePermit(p, now) && s.match(p));
      if (has) covered++;
      else issues.push({ kind: "service_uncovered", service: s.label });
    }
    servicesScore = Math.round((covered / subscribed.length) * 100);
  }

  // ── Trucks (20%) ────────────────────────────────────────────────────────────
  let trucksScore = 100;
  if (trucks.length > 0) {
    const complete = trucks.filter((tr) => !!tr.plate?.trim() && !!tr.vin?.trim() && tr.year != null);
    trucksScore = Math.round((complete.length / trucks.length) * 100);
    const incomplete = trucks.length - complete.length;
    if (incomplete > 0) issues.push({ kind: "truck_incomplete", count: incomplete });
  }

  // ── Client docs (20%) ───────────────────────────────────────────────────────
  let filledDocs = 0;
  for (const f of DOC_FIELDS) {
    const v = client[f.key];
    if (v && String(v).trim() !== "") filledDocs++;
    else issues.push({ kind: "doc_missing", field: f.label });
  }
  const docsScore = Math.round((filledDocs / DOC_FIELDS.length) * 100);

  // ── Permit expiration (20%) ─────────────────────────────────────────────────
  let expirationScore = 100;
  if (permits.length > 0) {
    let expired = 0;
    let expiring = 0;
    let healthy = 0;
    for (const p of permits) {
      if (p.status !== "active") continue;
      const d = daysUntil(p.expiration_date, now);
      if (d <= 0) expired++;
      else if (d <= EXPIRING_WINDOW_DAYS) expiring++;
      else healthy++;
    }
    const considered = expired + expiring + healthy;
    if (considered > 0) {
      expirationScore = Math.round((healthy / considered) * 100);
    }
    if (expired > 0) issues.push({ kind: "permit_expired", count: expired });
    if (expiring > 0) issues.push({ kind: "permit_expiring", count: expiring });
  }

  const score = Math.round(
    0.4 * servicesScore + 0.2 * trucksScore + 0.2 * docsScore + 0.2 * expirationScore,
  );
  const level: ScorecardLevel = score >= 80 ? "healthy" : score >= 50 ? "warning" : "critical";

  return {
    score,
    level,
    breakdown: { services: servicesScore, trucks: trucksScore, docs: docsScore, expiration: expirationScore },
    issues,
  };
}
