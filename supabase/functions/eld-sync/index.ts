// ELD sync (Motive / Samsara) — SCAFFOLD
//
// Reads `eld_connections` rows in status='connected' and pulls HOS violations
// into the existing hos_violations table (source = eld_motive | eld_samsara).
// DVIR/maintenance and IFTA mileage are left as follow-ups — the provider
// adapters are the single extension point.
//
// Two invocation modes:
//   - cron (service role, empty body): sync every connected org.
//   - manual (user JWT + { org_id }): the caller must be an org admin; only
//     that org is synced.
//
// STATUS: until real Motive/Samsara developer credentials exist, the provider
// adapters return [] (guarded on missing api_key / unexpected payloads), so a
// run is a safe no-op that still records an eld_sync_log entry. Wiring the
// real endpoints is isolated to fetchMotive() / fetchSamsara().

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type HosRule =
  | "driving_11h" | "on_duty_14h" | "break_30min"
  | "weekly_60h" | "weekly_70h" | "logbook_error" | "other";
type HosSeverity = "minor" | "serious" | "critical";

// Normalized HOS record the adapters emit; the loader resolves the driver and
// writes hos_violations rows.
interface NormalizedHos {
  driverEmail?: string | null;
  driverName?: string | null;
  occurredAt: string; // ISO
  rule: HosRule;
  severity: HosSeverity;
}

// Map a provider's violation label onto our enum. Unknown labels fall to
// "other" so a new provider code never drops the record silently.
function mapRule(raw: string): HosRule {
  const k = (raw || "").toLowerCase();
  if (k.includes("11")) return "driving_11h";
  if (k.includes("14")) return "on_duty_14h";
  if (k.includes("30") || k.includes("break")) return "break_30min";
  if (k.includes("60")) return "weekly_60h";
  if (k.includes("70")) return "weekly_70h";
  if (k.includes("log") || k.includes("form")) return "logbook_error";
  return "other";
}

// ── Provider adapters ────────────────────────────────────────────────────────
// Documented endpoints kept here for the wiring step. They run only with a key
// and swallow any shape mismatch (returning []) so the scaffold is safe.

async function fetchMotive(apiKey: string, sinceISO: string): Promise<NormalizedHos[]> {
  if (!apiKey) return [];
  try {
    // TODO(real-credentials): confirm endpoint + auth scheme with Motive docs.
    const res = await fetch(
      `https://api.gomotive.com/v1/hours_of_service/violations?start_date=${encodeURIComponent(sinceISO)}`,
      { headers: { "X-Api-Key": apiKey, Accept: "application/json" } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data?.violations) ? data.violations : [];
    return list.map((v: any): NormalizedHos => ({
      driverEmail: v?.driver?.email ?? null,
      driverName: v?.driver?.name ?? null,
      occurredAt: v?.start_time ?? new Date().toISOString(),
      rule: mapRule(v?.type ?? v?.violation_type ?? ""),
      severity: "serious",
    }));
  } catch {
    return [];
  }
}

async function fetchSamsara(apiKey: string, sinceISO: string): Promise<NormalizedHos[]> {
  if (!apiKey) return [];
  try {
    // TODO(real-credentials): confirm endpoint + query params with Samsara docs.
    const res = await fetch(
      `https://api.samsara.com/fleet/hos/violations?startTime=${encodeURIComponent(sinceISO)}`,
      { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data?.data) ? data.data : [];
    return list.map((v: any): NormalizedHos => ({
      driverEmail: v?.driver?.email ?? null,
      driverName: v?.driver?.name ?? null,
      occurredAt: v?.violationStartTime ?? new Date().toISOString(),
      rule: mapRule(v?.violationType ?? ""),
      severity: "serious",
    }));
  } catch {
    return [];
  }
}

async function fetchForProvider(provider: string, apiKey: string, sinceISO: string) {
  if (provider === "motive") return fetchMotive(apiKey, sinceISO);
  if (provider === "samsara") return fetchSamsara(apiKey, sinceISO);
  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const runId = crypto.randomUUID();
  const log = (level: string, msg: string, extra?: unknown) =>
    console.log(JSON.stringify({ runId, level, msg, extra, ts: new Date().toISOString() }));

  try {
    let orgFilter: string | null = null;

    // Manual mode: a user JWT + org_id restricts the run to one org and
    // requires admin membership.
    const authHeader = req.headers.get("Authorization") ?? "";
    let body: any = {};
    try { body = await req.json(); } catch { /* cron sends empty body */ }
    if (body?.org_id) {
      const caller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims } = await caller.auth.getClaims(authHeader.replace("Bearer ", ""));
      const callerId = claims?.claims?.sub as string | undefined;
      if (!callerId) throw new Error("Not authenticated");
      const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", body.org_id)
        .eq("user_id", callerId)
        .eq("approval_status", "approved")
        .maybeSingle();
      if (!membership || !["owner", "admin"].includes(membership.role)) throw new Error("Forbidden");
      orgFilter = body.org_id;
    }

    let q = supabase.from("eld_connections").select("*").eq("status", "connected");
    if (orgFilter) q = q.eq("org_id", orgFilter);
    const { data: connections, error: connErr } = await q;
    if (connErr) throw connErr;

    let totalImported = 0;
    for (const conn of connections ?? []) {
      const startedLog = await supabase
        .from("eld_sync_log")
        .insert({ org_id: conn.org_id, provider: conn.provider, status: "running" })
        .select("id")
        .single();
      const logId = startedLog.data?.id;

      // Look back from the last successful sync (default: 30 days).
      const since = conn.last_sync_at
        ? new Date(conn.last_sync_at).toISOString()
        : new Date(Date.now() - 30 * 86_400_000).toISOString();

      let imported = 0;
      let errorMsg: string | null = null;
      try {
        const records = await fetchForProvider(conn.provider, conn.api_key ?? "", since);

        if (records.length) {
          // Resolve provider drivers against our drivers table (by email, then
          // name) within the org.
          const { data: drivers } = await supabase
            .from("drivers")
            .select("id, user_id, full_name, email")
            .eq("org_id", conn.org_id);
          const byEmail = new Map<string, any>();
          const byName = new Map<string, any>();
          for (const d of drivers ?? []) {
            if (d.email) byEmail.set(String(d.email).toLowerCase(), d);
            if (d.full_name) byName.set(String(d.full_name).toLowerCase(), d);
          }

          for (const rec of records) {
            const driver =
              (rec.driverEmail && byEmail.get(rec.driverEmail.toLowerCase())) ||
              (rec.driverName && byName.get(rec.driverName.toLowerCase()));
            if (!driver) continue; // unmatched driver — skip

            // Dedup on (driver, occurred_at, rule).
            const { data: existing } = await supabase
              .from("hos_violations")
              .select("id")
              .eq("driver_id", driver.id)
              .eq("occurred_at", rec.occurredAt)
              .eq("rule_violated", rec.rule)
              .limit(1);
            if (existing?.length) continue;

            const { error: insErr } = await supabase.from("hos_violations").insert({
              org_id: conn.org_id,
              driver_id: driver.id,
              user_id: driver.user_id,
              occurred_at: rec.occurredAt,
              rule_violated: rec.rule,
              severity: rec.severity,
              source: conn.provider === "motive" ? "eld_motive" : "eld_samsara",
            });
            if (!insErr) imported++;
          }
        }
      } catch (e) {
        errorMsg = (e as Error).message;
        log("error", "provider_sync_failed", { org: conn.org_id, provider: conn.provider, error: errorMsg });
      }

      totalImported += imported;
      await supabase
        .from("eld_connections")
        .update({ last_sync_at: new Date().toISOString(), last_error: errorMsg, status: errorMsg ? "error" : "connected" })
        .eq("id", conn.id);
      if (logId) {
        await supabase
          .from("eld_sync_log")
          .update({ finished_at: new Date().toISOString(), hos_imported: imported, status: errorMsg ? "error" : "ok", message: errorMsg })
          .eq("id", logId);
      }
    }

    log("info", "run_complete", { connections: connections?.length ?? 0, totalImported });
    return new Response(JSON.stringify({ runId, connections: connections?.length ?? 0, imported: totalImported }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const status = (e as Error).message === "Forbidden" ? 403 : 500;
    log("error", "run_failed", { error: (e as Error).message });
    return new Response(JSON.stringify({ runId, error: (e as Error).message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
