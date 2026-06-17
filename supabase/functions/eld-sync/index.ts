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

// Normalize provider severity wording onto our 3-level scale. Default to
// "serious" — a violation we can't grade still warrants attention.
function mapSeverity(raw: string | null | undefined): HosSeverity {
  const k = (raw || "").toLowerCase();
  if (k.includes("critical") || k.includes("egregious") || k.includes("severe")) return "critical";
  if (k.includes("minor") || k.includes("warning") || k.includes("low")) return "minor";
  return "serious";
}

// AES-GCM(PBKDF2) decryption of the stored api_key — mirrors the portal-user
// scheme; input is base64(salt|iv|ct). Throws on a bad key/payload so the loader
// can flag the connection in error. Legacy plaintext keys must be re-entered
// through eld-connect (which encrypts on write).
async function decryptSecret(payload: string, secret: string): Promise<string> {
  const bin = atob(payload);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const salt = bytes.slice(0, 16);
  const iv = bytes.slice(16, 28);
  const ciphertext = bytes.slice(28);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 120_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

// ── Provider adapters ────────────────────────────────────────────────────────
// Both adapters page through the full result set and run only with a key; any
// shape mismatch or non-2xx response throws so the loader records the error
// (rather than silently importing nothing). A hard page cap guards runaways.
const MAX_PAGES = 50;

async function fetchMotive(apiKey: string, sinceISO: string): Promise<NormalizedHos[]> {
  if (!apiKey) return [];
  const out: NormalizedHos[] = [];
  // Motive paginates with ?page_no / pagination.per_page.
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(
      `https://api.gomotive.com/v1/hours_of_service/violations?start_date=${encodeURIComponent(sinceISO)}&page_no=${page}&per_page=100`,
      { headers: { "X-Api-Key": apiKey, Accept: "application/json" } },
    );
    if (!res.ok) throw new Error(`Motive HTTP ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data?.violations) ? data.violations : [];
    for (const w of list) {
      const v = w?.violation ?? w;
      out.push({
        driverEmail: v?.driver?.email ?? null,
        driverName: v?.driver?.name ?? ([v?.driver?.first_name, v?.driver?.last_name].filter(Boolean).join(" ") || null),
        occurredAt: v?.start_time ?? v?.violation_start_time ?? new Date().toISOString(),
        rule: mapRule(v?.type ?? v?.violation_type ?? ""),
        severity: mapSeverity(v?.severity),
      });
    }
    if (list.length === 0) break;
  }
  return out;
}

async function fetchSamsara(apiKey: string, sinceISO: string): Promise<NormalizedHos[]> {
  if (!apiKey) return [];
  const out: NormalizedHos[] = [];
  let after: string | null = null;
  // Samsara uses opaque cursor pagination (pagination.endCursor / hasNextPage).
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL("https://api.samsara.com/fleet/hos/violations");
    url.searchParams.set("startTime", sinceISO);
    url.searchParams.set("endTime", new Date().toISOString());
    if (after) url.searchParams.set("after", after);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Samsara HTTP ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data?.data) ? data.data : [];
    for (const v of list) {
      out.push({
        driverEmail: v?.driver?.email ?? null,
        driverName: v?.driver?.name ?? null,
        occurredAt: v?.violationStartTime ?? v?.startTime ?? new Date().toISOString(),
        rule: mapRule(v?.violationType ?? v?.type ?? ""),
        severity: mapSeverity(v?.severity),
      });
    }
    if (data?.pagination?.hasNextPage && data?.pagination?.endCursor) {
      after = data.pagination.endCursor as string;
    } else break;
  }
  return out;
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
      let unmatched = 0;
      let errorMsg: string | null = null;
      try {
        // Decrypt the stored credential. A failure here means the key was never
        // encrypted (legacy plaintext) or the encryption secret is missing —
        // surface it instead of silently calling the provider with garbage.
        const encKey = Deno.env.get("ELD_ENCRYPTION_KEY");
        let apiKey = "";
        if (conn.api_key) {
          if (!encKey || encKey.length < 16) throw new Error("ELD_ENCRYPTION_KEY not configured");
          try {
            apiKey = await decryptSecret(conn.api_key, encKey);
          } catch {
            throw new Error("Could not decrypt api_key — reconnect this ELD to re-encrypt the credential");
          }
        }

        const records = await fetchForProvider(conn.provider, apiKey, since);

        if (records.length) {
          // Local drivers for auto-matching by email then name.
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
          const driverById = new Map<string, any>();
          for (const d of drivers ?? []) driverById.set(d.id, d);

          // Existing match decisions (link / ignore / known-unmatched) keyed by
          // the same normalized external_key the UI resolves against.
          const { data: matchRows } = await supabase
            .from("eld_driver_matches")
            .select("external_key, driver_id, status")
            .eq("org_id", conn.org_id)
            .eq("provider", conn.provider);
          const matchByKey = new Map<string, { driver_id: string | null; status: string }>();
          for (const m of matchRows ?? []) matchByKey.set(m.external_key, { driver_id: m.driver_id, status: m.status });

          // Normalized identity → email lowercased, else name lowercased.
          const keyFor = (rec: NormalizedHos) =>
            (rec.driverEmail && rec.driverEmail.toLowerCase()) ||
            (rec.driverName && rec.driverName.toLowerCase()) ||
            "";
          // Count unmatched identities (not raw violations) seen this run, plus
          // the freshest display name/email per key.
          const unmatchedSeen = new Map<string, { email: string | null; name: string | null; count: number }>();
          // Keys resolved by auto-match (email/name) → driver id, so we can record
          // the link and clear any stale unmatched row.
          const autoLinked = new Map<string, string>();

          for (const rec of records) {
            const key = keyFor(rec);
            const decided = key ? matchByKey.get(key) : undefined;
            if (decided?.status === "ignored") continue; // operator chose to ignore

            // Resolve the target driver: explicit link first, then auto-match.
            let driver =
              (decided?.status === "linked" && decided.driver_id && driverById.get(decided.driver_id)) ||
              (rec.driverEmail && byEmail.get(rec.driverEmail.toLowerCase())) ||
              (rec.driverName && byName.get(rec.driverName.toLowerCase())) ||
              null;

            if (!driver) {
              // No local match yet — buffer the identity for the matching UI.
              if (key) {
                const agg = unmatchedSeen.get(key) ?? { email: rec.driverEmail ?? null, name: rec.driverName ?? null, count: 0 };
                agg.count++;
                unmatchedSeen.set(key, agg);
                unmatched++;
              }
              continue;
            }

            // Resolved by auto-match (not an explicit link) — remember it so we
            // persist the mapping and clear any stale unmatched row below.
            if (key && decided?.status !== "linked") autoLinked.set(key, driver.id);

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

          // Upsert the unmatched identities so the Drivers hub can surface them.
          for (const [key, agg] of unmatchedSeen) {
            await supabase.from("eld_driver_matches").upsert(
              {
                org_id: conn.org_id,
                provider: conn.provider,
                external_key: key,
                external_email: agg.email,
                external_name: agg.name,
                violations_pending: agg.count,
                last_seen_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "org_id,provider,external_key", ignoreDuplicates: false },
            );
          }

          // Record auto-matched identities as linked so future runs short-circuit
          // and any stale unmatched row disappears from the matching UI.
          for (const [key, driverId] of autoLinked) {
            await supabase.from("eld_driver_matches").upsert(
              {
                org_id: conn.org_id,
                provider: conn.provider,
                external_key: key,
                driver_id: driverId,
                status: "linked",
                violations_pending: 0,
                last_seen_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "org_id,provider,external_key", ignoreDuplicates: false },
            );
          }
        }
      } catch (e) {
        errorMsg = (e as Error).message;
        log("error", "provider_sync_failed", { org: conn.org_id, provider: conn.provider, error: errorMsg });
      }

      if (unmatched > 0) log("warn", "unmatched_drivers", { org: conn.org_id, provider: conn.provider, unmatched });

      totalImported += imported;
      await supabase
        .from("eld_connections")
        .update({ last_sync_at: new Date().toISOString(), last_error: errorMsg, status: errorMsg ? "error" : "connected" })
        .eq("id", conn.id);
      if (logId) {
        const message = errorMsg ?? (unmatched > 0 ? `${unmatched} violation(s) skipped — driver not found in this org` : null);
        await supabase
          .from("eld_sync_log")
          .update({ finished_at: new Date().toISOString(), hos_imported: imported, status: errorMsg ? "error" : "ok", message })
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
