// FMCSA weekly monitor
//
// For every client with a DOT number, fetch the latest carrier record from
// FMCSA QC, persist a snapshot, and emit a notification when safety_rating
// or status_code drifts from the previous snapshot.
//
// Triggered by pg_cron every Monday at 04:00 UTC (see migration
// 20260521120000_fmcsa_monitoring.sql). Service-role auth — never call this
// from the browser.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CarrierFields {
  safety_rating: string;
  status_code: string;
  total_drivers: number;
  total_power_units: number;
  carrier_operation: string;
  raw: unknown;
}

async function fetchCarrier(dot: string, webKey: string): Promise<CarrierFields | null> {
  const fmcsaUrl = `https://mobile.fmcsa.dot.gov/qc/services/carriers/${dot}?webKey=${webKey}`;
  // Same allorigins proxy used by the on-demand fmcsa-lookup function — the
  // FMCSA endpoint serves an outdated TLS cert that Deno's fetch rejects.
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fmcsaUrl)}`;
  const response = await fetch(proxyUrl, { headers: { Accept: "application/json" } });
  if (!response.ok) return null;
  const data = await response.json();
  const carrier = data?.content?.carrier;
  if (!carrier) return null;
  return {
    safety_rating: String(carrier.safetyRating ?? ""),
    status_code: String(carrier.statusCode ?? ""),
    total_drivers: Number(carrier.totalDrivers ?? 0) || 0,
    total_power_units: Number(carrier.totalPowerUnits ?? 0) || 0,
    carrier_operation: String(carrier.carrierOperation?.carrierOperationDesc ?? ""),
    raw: carrier,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const webKey = Deno.env.get("FMCSA_WEB_KEY");
  const supabase = createClient(supabaseUrl, serviceKey);

  const runId = crypto.randomUUID();
  const log = (level: "info" | "warn" | "error", msg: string, extra?: unknown) => {
    console.log(JSON.stringify({ runId, level, msg, extra, ts: new Date().toISOString() }));
  };

  if (!webKey) {
    log("error", "missing_fmcsa_web_key");
    return new Response(JSON.stringify({ runId, error: "FMCSA_WEB_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { data: clients, error: clientsErr } = await supabase
      .from("clients")
      .select("id, user_id, org_id, company_name, dot")
      .not("dot", "is", null)
      .neq("dot", "");

    if (clientsErr) throw clientsErr;

    let polled = 0;
    let snapshotted = 0;
    let alerted = 0;
    let failed = 0;

    for (const client of clients ?? []) {
      const dot = String(client.dot ?? "").trim();
      if (!dot) continue;
      polled++;

      const fields = await fetchCarrier(dot, webKey);
      if (!fields) {
        failed++;
        log("warn", "fmcsa_fetch_failed", { clientId: client.id, dot });
        continue;
      }

      const { data: previous } = await supabase
        .from("fmcsa_snapshots")
        .select("safety_rating, status_code")
        .eq("client_id", client.id)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const safetyChanged =
        previous && previous.safety_rating !== fields.safety_rating;
      const statusChanged =
        previous && previous.status_code !== fields.status_code;

      // Only persist a snapshot when something material changed or no snapshot
      // exists yet — keeps the table from growing unboundedly with identical
      // weekly rows.
      const isFirst = !previous;
      if (isFirst || safetyChanged || statusChanged) {
        const { error: snapErr } = await supabase.from("fmcsa_snapshots").insert({
          org_id: client.org_id,
          client_id: client.id,
          dot,
          safety_rating: fields.safety_rating || null,
          status_code: fields.status_code || null,
          total_drivers: fields.total_drivers,
          total_power_units: fields.total_power_units,
          carrier_operation: fields.carrier_operation || null,
          raw: fields.raw,
        });
        if (snapErr) {
          log("error", "snapshot_insert_failed", { clientId: client.id, error: snapErr.message });
          failed++;
          continue;
        }
        snapshotted++;
      }

      // Alert only when a previous snapshot existed and a watched field
      // changed — first-sight values aren't actionable.
      if (safetyChanged || statusChanged) {
        const changes: string[] = [];
        if (safetyChanged) {
          changes.push(`Safety rating: ${previous!.safety_rating || "—"} → ${fields.safety_rating || "—"}`);
        }
        if (statusChanged) {
          changes.push(`Status: ${previous!.status_code || "—"} → ${fields.status_code || "—"}`);
        }

        const { error: notifErr } = await supabase.from("notifications").insert({
          user_id: client.user_id,
          org_id: client.org_id,
          type: "fmcsa_change",
          title: `FMCSA: mudança em ${client.company_name}`,
          body: changes.join(" · "),
          entity_id: client.id,
        });
        if (notifErr) {
          log("warn", "notification_insert_failed", { clientId: client.id, error: notifErr.message });
        } else {
          alerted++;
        }
      }
    }

    log("info", "run_complete", { polled, snapshotted, alerted, failed });
    return new Response(
      JSON.stringify({ runId, polled, snapshotted, alerted, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    log("error", "run_failed", { error: (err as Error).message });
    return new Response(JSON.stringify({ runId, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
