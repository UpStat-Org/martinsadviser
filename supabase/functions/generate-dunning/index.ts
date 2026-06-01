// Feature 3 — Accounts-Receivable Dunning engine
//
// Daily cron walks overdue invoices and escalates a collection cadence. For
// each invoice it fires the HIGHEST configured stage (days-past-due) that has
// been reached but not yet handled, drafting a reminder per configured channel.
//
// Anti-flood: a freshly-imported 40-day-overdue invoice should NOT blast all of
// {1,7,15,30} at once. Lower reached-but-new stages are recorded in dunning_log
// as handled (enqueued=false) WITHOUT a message; only the single highest new
// stage drafts a message. Future stages still fire on later days.
//
// Approval queue: drafts are written to scheduled_messages with
// status='pending_review' (ignored by claim_pending_messages) unless the org
// has auto_send=true, in which case they go straight to 'pending'.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAY_MS = 86_400_000;

function fmtAmount(n: number): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function makeReplacer(vars: Record<string, string>) {
  return (text: string) => text.replace(/\{[a-z_]+\}/g, (m) => (m in vars ? vars[m] : m));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const runId = crypto.randomUUID();
  const log = (level: "info" | "warn" | "error", msg: string, extra?: unknown) =>
    console.log(JSON.stringify({ runId, level, msg, extra, ts: new Date().toISOString() }));

  try {
    const { data: settingsRows, error: settingsErr } = await supabase
      .from("dunning_settings")
      .select("*")
      .eq("enabled", true);
    if (settingsErr) throw settingsErr;
    if (!settingsRows?.length) {
      return new Response(JSON.stringify({ runId, message: "No orgs with dunning enabled", drafted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const todayStr = new Date(todayMs).toISOString().slice(0, 10);

    let totalDrafted = 0; // messages written
    let totalStages = 0; // stages handled (incl. silent)
    let totalErrors = 0;
    let anyAutoSendEnqueued = false;

    for (const s of settingsRows) {
      const stageDays: number[] = [...(s.stage_days ?? [])].map(Number).filter((n) => n >= 0).sort((a, b) => a - b);
      const channels: string[] = (s.channels ?? []).filter(Boolean);
      if (!stageDays.length || !channels.length) continue;

      const { data: invoices, error: invErr } = await supabase
        .from("invoices")
        .select("id, user_id, org_id, client_id, amount, due_date, status, clients(company_name)")
        .eq("org_id", s.org_id)
        .in("status", ["pending", "overdue"])
        .lt("due_date", todayStr);
      if (invErr) {
        log("error", "fetch_invoices_failed", { orgId: s.org_id, error: invErr.message });
        totalErrors++;
        continue;
      }
      if (!invoices?.length) continue;

      // Existing handled stages for these invoices, fetched in one round-trip.
      const invoiceIds = invoices.map((i) => i.id);
      const { data: logs } = await supabase
        .from("dunning_log")
        .select("invoice_id, stage")
        .in("invoice_id", invoiceIds);
      const handled = new Set((logs ?? []).map((l) => `${l.invoice_id}:${l.stage}`));

      for (const inv of invoices) {
        const dueMs = new Date(inv.due_date).getTime();
        const daysOverdue = Math.floor((todayMs - dueMs) / DAY_MS);
        if (daysOverdue < (stageDays[0] ?? 1)) continue;

        const reachedNew = stageDays.filter((st) => st <= daysOverdue && !handled.has(`${inv.id}:${st}`));
        if (!reachedNew.length) continue;

        const highest = reachedNew[reachedNew.length - 1];

        for (const st of reachedNew) {
          const willEnqueue = st === highest;

          const { error: logErr } = await supabase
            .from("dunning_log")
            .insert({ org_id: s.org_id, invoice_id: inv.id, stage: st, enqueued: willEnqueue });
          if (logErr) {
            // 23505 → another run already handled this stage; skip quietly.
            if ((logErr as { code?: string }).code !== "23505") {
              log("error", "dunning_log_insert_failed", { invoiceId: inv.id, stage: st, error: logErr.message });
              totalErrors++;
            }
            continue;
          }
          totalStages++;

          if (!willEnqueue) continue; // silent: recorded so it never backfills

          const company = (inv as any).clients?.company_name ?? "";
          const replace = makeReplacer({
            "{company_name}": company,
            "{amount}": fmtAmount(Number(inv.amount)),
            "{due_date}": String(inv.due_date),
            "{days_overdue}": String(daysOverdue),
          });
          const subject = replace(s.subject ?? "");
          const body = replace(s.body ?? "");
          const status = s.auto_send ? "pending" : "pending_review";

          for (const channel of channels) {
            const { error: msgErr } = await supabase.from("scheduled_messages").insert({
              user_id: inv.user_id,
              org_id: s.org_id,
              client_id: inv.client_id,
              channel,
              subject: channel === "email" ? subject : null,
              body,
              scheduled_at: new Date().toISOString(),
              status,
            });
            if (msgErr) {
              log("error", "scheduled_message_insert_failed", { invoiceId: inv.id, channel, error: msgErr.message });
              totalErrors++;
              continue;
            }
            totalDrafted++;
            if (s.auto_send) anyAutoSendEnqueued = true;
          }
        }
      }
    }

    // Only kick the sender when something was enqueued for immediate delivery.
    if (anyAutoSendEnqueued) {
      try {
        const r = await fetch(`${supabaseUrl}/functions/v1/send-emails`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: "{}",
        });
        if (!r.ok) log("warn", "send_emails_trigger_non_2xx", { status: r.status });
      } catch (e) {
        log("warn", "send_emails_trigger_failed", { error: (e as Error).message });
      }
    }

    log("info", "run_complete", { drafted: totalDrafted, stages: totalStages, errors: totalErrors });
    return new Response(
      JSON.stringify({ runId, message: "Done", drafted: totalDrafted, stages: totalStages, errors: totalErrors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    log("error", "run_failed", { error: (error as Error).message });
    return new Response(JSON.stringify({ runId, error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
