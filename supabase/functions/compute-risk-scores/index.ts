// Compliance risk scoring — daily job
//
// Computes a 0-100 *risk* score per client (higher = worse) and writes one
// dated snapshot per client into compliance_risk_scores. When a client newly
// crosses into the high/critical band relative to its previous snapshot, a
// `risk_high` notification is emitted (recipient = clients.user_id, same
// convention as generate-notifications / fmcsa-monitor).
//
// Triggered by pg_cron daily at 05:00 UTC (see migration
// 20260522120000_compliance_risk_scores.sql). Service-role auth — never call
// this from the browser.
//
// The weighting here is the single source of truth. The frontend only renders
// the stored score/band/factors; it never recomputes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Scoring model ───────────────────────────────────────────────────────────
// Each category contributes risk points up to a cap; the total is clamped to
// 100. Caps deliberately over-sum (120) so a client can saturate from several
// independent failure modes — driver-file gaps alone shouldn't max the score,
// but combined with permit/insurance/CSA problems they push a carrier critical.
const CAPS = {
  permits: 30,
  insurance: 20,
  csa: 20,
  hos: 15,
  drivers: 15,
  fmcsa: 10,
  invoices: 5,
  mcs150: 5,
} as const;

// Driver Qualification File — mirrors src/lib/dqf.ts. Required kinds are
// everything except "other"; annual docs (MVR) go stale after 12 months even
// without an explicit expiration date.
const REQUIRED_DQF_KINDS = [
  "application", "mvr", "road_test", "employment_verification",
  "medical_exam", "drug_test", "training",
] as const;
const ANNUAL_DQF_KINDS = new Set<string>(["mvr"]);
function isDqfDocCurrent(doc: { kind: string; expires_on: string | null; created_at: string }, refMs: number): boolean {
  if (doc.expires_on) return new Date(doc.expires_on).getTime() > refMs;
  if (!ANNUAL_DQF_KINDS.has(doc.kind)) return true;
  return refMs - new Date(doc.created_at).getTime() < 365 * 86_400_000;
}

// CSA BASIC intervention thresholds (general property carriers) — mirrors
// src/lib/csa.ts. A score >= threshold is an "alert"; within 15 below is a
// "watch".
const CSA_BASICS: Array<{ key: string; threshold: number }> = [
  { key: "unsafe_driving", threshold: 65 },
  { key: "hours_of_service", threshold: 65 },
  { key: "driver_fitness", threshold: 80 },
  { key: "controlled_substances", threshold: 80 },
  { key: "vehicle_maintenance", threshold: 80 },
  { key: "hazmat_compliance", threshold: 80 },
  { key: "crash_indicator", threshold: 65 },
];

type Factor = { code: string; count: number; points: number };

function bandFor(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 60) return "critical";
  if (score >= 35) return "high";
  if (score >= 15) return "medium";
  return "low";
}

const BAND_RANK: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };

function daysUntil(dateStr: string | null | undefined, ref: Date): number {
  if (!dateStr) return Infinity;
  return Math.ceil((new Date(dateStr).getTime() - ref.getTime()) / 86_400_000);
}

// Adds up to `cap` points across a list of sub-conditions, recording a factor
// for each non-zero condition with its marginal (post-cap) contribution.
function accumulate(
  factors: Factor[],
  cap: number,
  items: Array<{ code: string; count: number; per: number }>,
): number {
  let used = 0;
  for (const it of items) {
    if (it.count <= 0) continue;
    const raw = it.count * it.per;
    const pts = Math.max(0, Math.min(raw, cap - used));
    used += pts;
    factors.push({ code: it.code, count: it.count, points: Math.round(pts) });
  }
  return used;
}

// MCS-150 next-due — same derivation as generate-notifications.
const MONTH_BY_LAST_DIGIT: Record<string, number> = {
  "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5, "7": 6, "8": 7, "9": 8, "0": 9,
};
function nextMcs150Due(dot: string, lastFiledAt: string | null, ref: Date): Date | null {
  if (lastFiledAt) {
    const d = new Date(lastFiledAt);
    return new Date(Date.UTC(d.getUTCFullYear() + 2, d.getUTCMonth(), d.getUTCDate()));
  }
  const digits = dot.replace(/\D/g, "");
  if (digits.length < 2) return null;
  const month = MONTH_BY_LAST_DIGIT[digits[digits.length - 1]];
  if (month === undefined) return null;
  const wantsOdd = parseInt(digits[digits.length - 2], 10) % 2 === 1;
  for (let i = 0; i < 4; i++) {
    const cy = ref.getUTCFullYear() + i;
    if ((cy % 2 === 1) !== wantsOdd) continue;
    const candidate = new Date(Date.UTC(cy, month, 1));
    if (candidate.getTime() >= Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate())) {
      return candidate;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const runId = crypto.randomUUID();
  const log = (level: "info" | "warn" | "error", msg: string, extra?: unknown) => {
    console.log(JSON.stringify({ runId, level, msg, extra, ts: new Date().toISOString() }));
  };
  const ref = new Date();
  const today = ref.toISOString().slice(0, 10);

  try {
    // ── Bulk-load every signal once, then group in memory ────────────────────
    const [
      { data: clients, error: clientsErr },
      { data: permits },
      { data: insurance },
      { data: csa },
      { data: drivers },
      { data: hos },
      { data: invoices },
      { data: fmcsa },
      { data: driverDocs },
    ] = await Promise.all([
      supabase.from("clients").select("id, user_id, org_id, company_name, dot, status, mcs_150_last_filed_at").neq("status", "inactive"),
      supabase.from("permits").select("client_id, status, expiration_date"),
      supabase.from("insurance_certificates").select("client_id, expiration_date"),
      supabase.from("csa_snapshots").select("client_id, measurement_period, unsafe_driving, hours_of_service, driver_fitness, controlled_substances, vehicle_maintenance, hazmat_compliance, crash_indicator").order("measurement_period", { ascending: false }),
      supabase.from("drivers").select("id, client_id, status, cdl_expires_on, medical_card_expires_on"),
      supabase.from("hos_violations").select("driver_id, severity, occurred_at, resolved_at").is("resolved_at", null),
      supabase.from("invoices").select("client_id, status, due_date"),
      supabase.from("fmcsa_snapshots").select("client_id, safety_rating, status_code, fetched_at").order("fetched_at", { ascending: false }),
      supabase.from("driver_documents").select("driver_id, kind, expires_on, created_at").order("created_at", { ascending: false }),
    ]);
    if (clientsErr) throw clientsErr;

    // Group permits / insurance / invoices by client.
    const byClient = <T extends { client_id: string }>(rows: T[] | null) => {
      const m = new Map<string, T[]>();
      for (const r of rows ?? []) {
        const arr = m.get(r.client_id) ?? [];
        arr.push(r);
        m.set(r.client_id, arr);
      }
      return m;
    };
    const permitsBy = byClient(permits as any[]);
    const insuranceBy = byClient(insurance as any[]);
    const invoicesBy = byClient(invoices as any[]);

    // Latest CSA / FMCSA per client (rows already sorted desc above).
    const latestBy = <T extends { client_id: string }>(rows: T[] | null) => {
      const m = new Map<string, T>();
      for (const r of rows ?? []) if (!m.has(r.client_id)) m.set(r.client_id, r);
      return m;
    };
    const csaBy = latestBy(csa as any[]);
    const fmcsaBy = latestBy(fmcsa as any[]);

    // HOS violations per client, via driver → client. Only last 90 days count.
    const driverToClient = new Map<string, string>();
    for (const d of (drivers as any[]) ?? []) driverToClient.set(d.id, d.client_id);
    const hosBy = new Map<string, { critical: number; serious: number; minor: number }>();
    for (const v of (hos as any[]) ?? []) {
      if (daysUntil(v.occurred_at, ref) < -90) continue; // older than 90 days
      const clientId = driverToClient.get(v.driver_id);
      if (!clientId) continue;
      const agg = hosBy.get(clientId) ?? { critical: 0, serious: 0, minor: 0 };
      if (v.severity === "critical") agg.critical++;
      else if (v.severity === "serious") agg.serious++;
      else agg.minor++;
      hosBy.set(clientId, agg);
    }

    // Driver Qualification File rollup per client. Only active drivers count —
    // terminated/inactive drivers can't incur an active compliance liability.
    const docsByDriver = new Map<string, Array<{ kind: string; expires_on: string | null; created_at: string }>>();
    for (const d of (driverDocs as any[]) ?? []) {
      const arr = docsByDriver.get(d.driver_id) ?? [];
      arr.push(d);
      docsByDriver.set(d.driver_id, arr);
    }
    const refMs = ref.getTime();
    type DriverAgg = {
      cdlExpired: number; cdlExpiring: number;
      medExpired: number; medExpiring: number;
      mvrOverdue: number; dqfIncomplete: number;
    };
    const driversBy = new Map<string, DriverAgg>();
    for (const d of (drivers as any[]) ?? []) {
      if (d.status && d.status !== "active") continue;
      const clientId = d.client_id;
      if (!clientId) continue;
      const agg = driversBy.get(clientId) ?? { cdlExpired: 0, cdlExpiring: 0, medExpired: 0, medExpiring: 0, mvrOverdue: 0, dqfIncomplete: 0 };

      const cdl = daysUntil(d.cdl_expires_on, ref);
      if (cdl < 0) agg.cdlExpired++; else if (cdl <= 30) agg.cdlExpiring++;
      const med = daysUntil(d.medical_card_expires_on, ref);
      if (med < 0) agg.medExpired++; else if (med <= 30) agg.medExpiring++;

      // Latest doc per kind (rows already newest-first) → DQF completeness.
      const latestByKind = new Map<string, { kind: string; expires_on: string | null; created_at: string }>();
      for (const doc of docsByDriver.get(d.id) ?? []) {
        if (!latestByKind.has(doc.kind)) latestByKind.set(doc.kind, doc);
      }
      let missingOrStale = 0;
      for (const kind of REQUIRED_DQF_KINDS) {
        const latest = latestByKind.get(kind);
        if (!latest || !isDqfDocCurrent(latest, refMs)) missingOrStale++;
      }
      if (missingOrStale > 0) agg.dqfIncomplete++;
      const mvr = latestByKind.get("mvr");
      if (!mvr || !isDqfDocCurrent(mvr, refMs)) agg.mvrOverdue++;

      driversBy.set(clientId, agg);
    }

    let scored = 0;
    let alerted = 0;

    for (const client of (clients as any[]) ?? []) {
      const factors: Factor[] = [];
      let total = 0;

      // ── Permits (cap 30) ──
      {
        let expired = 0, expiring = 0;
        for (const p of permitsBy.get(client.id) ?? []) {
          if (p.status !== "active") continue;
          const d = daysUntil(p.expiration_date, ref);
          if (d < 0) expired++;
          else if (d <= 30) expiring++;
        }
        total += accumulate(factors, CAPS.permits, [
          { code: "permit_expired", count: expired, per: 12 },
          { code: "permit_expiring", count: expiring, per: 5 },
        ]);
      }

      // ── Insurance (cap 20) ──
      {
        let expired = 0, expiring = 0;
        for (const c of insuranceBy.get(client.id) ?? []) {
          const d = daysUntil(c.expiration_date, ref);
          if (d === Infinity) continue;
          if (d < 0) expired++;
          else if (d <= 30) expiring++;
        }
        total += accumulate(factors, CAPS.insurance, [
          { code: "insurance_expired", count: expired, per: 12 },
          { code: "insurance_expiring", count: expiring, per: 5 },
        ]);
      }

      // ── CSA BASICs (cap 20) ──
      {
        const snap = csaBy.get(client.id);
        let alert = 0, watch = 0;
        if (snap) {
          for (const b of CSA_BASICS) {
            const v = snap[b.key];
            if (v == null) continue;
            if (v >= b.threshold) alert++;
            else if (v >= b.threshold - 15) watch++;
          }
        }
        total += accumulate(factors, CAPS.csa, [
          { code: "csa_alert", count: alert, per: 8 },
          { code: "csa_watch", count: watch, per: 3 },
        ]);
      }

      // ── HOS violations (cap 15) ──
      {
        const agg = hosBy.get(client.id) ?? { critical: 0, serious: 0, minor: 0 };
        total += accumulate(factors, CAPS.hos, [
          { code: "hos_critical", count: agg.critical, per: 6 },
          { code: "hos_serious", count: agg.serious, per: 3 },
          { code: "hos_minor", count: agg.minor, per: 1 },
        ]);
      }

      // ── Driver Qualification File (cap 15) ──
      {
        const agg = driversBy.get(client.id);
        if (agg) {
          total += accumulate(factors, CAPS.drivers, [
            { code: "driver_cdl_expired", count: agg.cdlExpired, per: 6 },
            { code: "driver_medical_expired", count: agg.medExpired, per: 6 },
            { code: "driver_cdl_expiring", count: agg.cdlExpiring, per: 2 },
            { code: "driver_medical_expiring", count: agg.medExpiring, per: 2 },
            { code: "driver_mvr_overdue", count: agg.mvrOverdue, per: 2 },
            { code: "driver_dqf_incomplete", count: agg.dqfIncomplete, per: 2 },
          ]);
        }
      }

      // ── FMCSA status / safety rating (cap 10) ──
      {
        const snap = fmcsaBy.get(client.id);
        let statusBad = 0, ratingBad = 0;
        if (snap) {
          const status = String(snap.status_code ?? "").toUpperCase();
          const rating = String(snap.safety_rating ?? "").toUpperCase();
          if (status && status !== "A") statusBad = 1; // A = active
          if (rating === "U" || rating === "C") ratingBad = 1; // Unsatisfactory / Conditional
        }
        total += accumulate(factors, CAPS.fmcsa, [
          { code: "fmcsa_status", count: statusBad, per: 10 },
          { code: "fmcsa_rating", count: ratingBad, per: 6 },
        ]);
      }

      // ── Overdue invoices (cap 5) ──
      {
        let overdue = 0;
        for (const inv of invoicesBy.get(client.id) ?? []) {
          if (inv.status === "paid") continue;
          if (daysUntil(inv.due_date, ref) < 0) overdue++;
        }
        total += accumulate(factors, CAPS.invoices, [
          { code: "invoice_overdue", count: overdue, per: 3 },
        ]);
      }

      // ── MCS-150 biennial coming due / overdue (cap 5) ──
      {
        const dot = String(client.dot ?? "").trim();
        let due = 0;
        if (dot) {
          const dueDate = nextMcs150Due(dot, client.mcs_150_last_filed_at ?? null, ref);
          if (dueDate && daysUntil(dueDate.toISOString().slice(0, 10), ref) <= 30) due = 1;
        }
        total += accumulate(factors, CAPS.mcs150, [
          { code: "mcs150_due", count: due, per: 5 },
        ]);
      }

      const score = Math.min(100, Math.round(total));
      const band = bandFor(score);

      // Previous snapshot (most recent before today) for escalation detection.
      const { data: prev } = await supabase
        .from("compliance_risk_scores")
        .select("band")
        .eq("client_id", client.id)
        .lt("scored_date", today)
        .order("scored_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { error: upErr } = await supabase
        .from("compliance_risk_scores")
        .upsert(
          {
            org_id: client.org_id,
            client_id: client.id,
            scored_date: today,
            score,
            band,
            factors,
          },
          { onConflict: "client_id,scored_date" },
        );
      if (upErr) {
        log("error", "score_upsert_failed", { clientId: client.id, error: upErr.message });
        continue;
      }
      scored++;

      // Notify when the client newly enters high/critical (or worsens within
      // those bands). First-ever sighting in high/critical also alerts.
      const escalated =
        BAND_RANK[band] >= BAND_RANK.high &&
        (!prev || BAND_RANK[band] > BAND_RANK[prev.band]);
      if (escalated) {
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", client.user_id)
          .eq("entity_id", client.id)
          .eq("type", "risk_high")
          .gte("created_at", `${today}T00:00:00Z`)
          .limit(1);
        if (!existing?.length) {
          const top = [...factors].sort((a, b) => b.points - a.points).slice(0, 2);
          await supabase.from("notifications").insert({
            user_id: client.user_id,
            org_id: client.org_id,
            type: "risk_high",
            title: `Risco ${band === "critical" ? "crítico" : "alto"}: ${client.company_name}`,
            body: `Score ${score}/100${top.length ? ` · ${top.map((f) => f.code).join(", ")}` : ""}`,
            entity_id: client.id,
          });
          alerted++;
        }
      }
    }

    log("info", "run_complete", { scored, alerted });
    return new Response(JSON.stringify({ runId, scored, alerted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    log("error", "run_failed", { error: (err as Error).message });
    return new Response(JSON.stringify({ runId, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
