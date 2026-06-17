// Driver Qualification File (DQF) — pure compliance logic.
//
// Single source of truth for the FMCSA driver-file rules used across the app:
//   * which documents make up a complete DQF
//   * whether a given document is still "current"
//   * the expiration rollup for a driver (CDL, medical card, DQF docs)
//
// Kept free of React / Supabase imports so it is trivially unit-testable and so
// edge functions can mirror the same thresholds. `useDqf` re-exports DqfKind /
// DQF_KINDS from here, so existing callers (DqfChecklist) are unaffected.

export type DqfKind =
  | "application"
  | "mvr"
  | "road_test"
  | "employment_verification"
  | "medical_exam"
  | "drug_test"
  | "training"
  | "other";

// `annual` documents (MVR, the annual drug-test summary) must be refreshed every
// 12 months even when they carry no explicit expiration date. One-time records
// (application, road test, employment verification) stay current forever.
export const DQF_KINDS: Array<{ kind: DqfKind; label: string; annual: boolean }> = [
  { kind: "application", label: "Application", annual: false },
  { kind: "mvr", label: "MVR (Motor Vehicle Record)", annual: true },
  { kind: "road_test", label: "Road Test Certificate", annual: false },
  { kind: "employment_verification", label: "Employment Verification", annual: false },
  { kind: "medical_exam", label: "Medical Exam Certificate", annual: false },
  { kind: "drug_test", label: "Drug Test Result", annual: false },
  { kind: "training", label: "Training Record", annual: false },
  { kind: "other", label: "Other", annual: false },
];

// Everything except "other" is part of the regulatory file.
export const REQUIRED_DQF_KINDS: DqfKind[] = DQF_KINDS.filter((k) => k.kind !== "other").map((k) => k.kind);

export const DAY_MS = 86_400_000;
export const SOON_DAYS = 30;

const ANNUAL = new Set<DqfKind>(DQF_KINDS.filter((k) => k.annual).map((k) => k.kind));

export type ExpiryState = "missing" | "expired" | "expiring" | "valid";

export interface ExpiryInfo {
  date: string | null;
  /** Whole days until expiry; negative when past, null when no date. */
  daysUntil: number | null;
  state: ExpiryState;
}

/** Classify a single expiration date relative to `now`. */
export function expiryStatus(date: string | null | undefined, now: number = Date.now(), soonDays = SOON_DAYS): ExpiryInfo {
  if (!date) return { date: null, daysUntil: null, state: "missing" };
  const daysUntil = Math.ceil((new Date(date).getTime() - now) / DAY_MS);
  let state: ExpiryState;
  if (daysUntil < 0) state = "expired";
  else if (daysUntil <= soonDays) state = "expiring";
  else state = "valid";
  return { date, daysUntil, state };
}

// Minimal structural shapes so this module never imports the data hooks.
export interface DqfDocLike {
  kind: DqfKind;
  expires_on: string | null;
  created_at: string;
}
export interface DriverLike {
  cdl_expires_on: string | null;
  medical_card_expires_on: string | null;
  status?: string;
}

/** Is a single DQF document still valid right now? (mirror of DqfChecklist) */
export function isDocCurrent(doc: DqfDocLike, now: number = Date.now()): boolean {
  if (doc.expires_on) return new Date(doc.expires_on).getTime() > now;
  if (!ANNUAL.has(doc.kind)) return true; // one-time record, no expiry
  return now - new Date(doc.created_at).getTime() < 365 * DAY_MS;
}

export interface DqfSummary {
  required: number;
  current: number;
  percent: number;
  complete: boolean;
  missing: DqfKind[];
  expired: DqfKind[];
}

/**
 * Roll up a driver's documents into DQF readiness. `missing` = required kind
 * with no document at all; `expired` = required kind whose latest document has
 * lapsed (or an annual doc gone stale).
 */
export function summarizeDqf(docs: DqfDocLike[] | null | undefined, now: number = Date.now()): DqfSummary {
  const latestByKind = new Map<DqfKind, DqfDocLike>();
  for (const d of docs ?? []) {
    if (!latestByKind.has(d.kind)) latestByKind.set(d.kind, d); // callers pass newest-first
  }
  const missing: DqfKind[] = [];
  const expired: DqfKind[] = [];
  let current = 0;
  for (const kind of REQUIRED_DQF_KINDS) {
    const latest = latestByKind.get(kind);
    if (!latest) missing.push(kind);
    else if (isDocCurrent(latest, now)) current++;
    else expired.push(kind);
  }
  const required = REQUIRED_DQF_KINDS.length;
  return {
    required,
    current,
    percent: required === 0 ? 100 : Math.round((current / required) * 100),
    complete: current === required,
    missing,
    expired,
  };
}

export type ComplianceLevel = "ok" | "attention" | "critical";

export interface DriverComplianceStatus {
  cdl: ExpiryInfo;
  medical: ExpiryInfo;
  dqf: DqfSummary;
  level: ComplianceLevel;
  /** Sortable urgency: higher = worse. Drives the hub's default ordering. */
  urgency: number;
}

/**
 * Whole-driver compliance rollup combining CDL, medical card and DQF docs.
 * `level` is what badges/filters key off; `urgency` gives a stable sort so the
 * most at-risk drivers float to the top of the hub.
 */
export function driverCompliance(
  driver: DriverLike,
  docs: DqfDocLike[] | null | undefined,
  now: number = Date.now(),
): DriverComplianceStatus {
  const cdl = expiryStatus(driver.cdl_expires_on, now);
  const medical = expiryStatus(driver.medical_card_expires_on, now);
  const dqf = summarizeDqf(docs, now);

  // A driver cannot legally operate with an expired CDL or medical card, and a
  // file missing required records is an audit finding — those are "critical".
  const critical =
    cdl.state === "expired" ||
    medical.state === "expired" ||
    dqf.expired.length > 0 ||
    dqf.missing.length > 0;
  const attention =
    cdl.state === "expiring" || medical.state === "expiring" || !dqf.complete;

  const level: ComplianceLevel = critical ? "critical" : attention ? "attention" : "ok";

  // Urgency: expired items dominate, then how soon things lapse, then file gaps.
  let urgency = 0;
  if (cdl.state === "expired") urgency += 1000;
  if (medical.state === "expired") urgency += 1000;
  urgency += dqf.missing.length * 100 + dqf.expired.length * 100;
  for (const e of [cdl, medical]) {
    if (e.state === "expiring" && e.daysUntil != null) urgency += Math.max(0, 60 - e.daysUntil);
  }
  return { cdl, medical, dqf, level, urgency };
}
