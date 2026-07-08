// Feature 3 — Recurring invoice engine
//
// Daily cron walks active recurring_plans whose next_run_on has arrived and
// turns each into a pending invoice, then advances next_run_on by the plan's
// frequency. Idempotency comes from advancing next_run_on in the same pass:
// a plan is only ever due once per period, and a re-run on the same day finds
// next_run_on already in the future.
//
// Catch-up: if a plan was paused/backdated and several periods elapsed, we
// only generate ONE invoice per run and step next_run_on forward by a single
// period. Successive daily runs drain the backlog without ever double-billing
// a period.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Advance an ISO date (YYYY-MM-DD) by one billing period, clamping the day of
// month so e.g. Jan-31 monthly → Feb-28/29 rather than rolling into March.
function advance(dateStr: string, frequency: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  let year = y;
  let month = m; // 1-based
  if (frequency === "monthly") month += 1;
  else if (frequency === "quarterly") month += 3;
  else if (frequency === "yearly") year += 1;
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const runId = crypto.randomUUID();
  const log = (level: "info" | "warn" | "error", msg: string, extra?: unknown) =>
    console.log(JSON.stringify({ runId, level, msg, extra, ts: new Date().toISOString() }));

  const today = new Date().toISOString().slice(0, 10);

  try {
    const { data: plans, error: plansErr } = await supabase
      .from("recurring_plans")
      .select("*")
      .eq("status", "active")
      .lte("next_run_on", today);
    if (plansErr) throw plansErr;

    if (!plans?.length) {
      return new Response(
        JSON.stringify({ runId, message: "No plans due", generated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let generated = 0;
    for (const plan of plans) {
      const runOn: string = plan.next_run_on;
      const dueDate = addDays(runOn, plan.net_days ?? 15);

      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          org_id: plan.org_id,
          user_id: plan.user_id,
          client_id: plan.client_id,
          amount: plan.amount,
          status: "pending",
          due_date: dueDate,
          description: plan.description || plan.name,
        })
        .select("id")
        .single();

      if (invErr) {
        log("error", "invoice_insert_failed", { planId: plan.id, error: invErr.message });
        continue;
      }

      const { error: updErr } = await supabase
        .from("recurring_plans")
        .update({
          next_run_on: advance(runOn, plan.frequency),
          last_invoice_on: today,
          invoices_generated: (plan.invoices_generated ?? 0) + 1,
        })
        .eq("id", plan.id);

      if (updErr) {
        // The invoice already exists; log so a human can reconcile the plan.
        log("error", "plan_advance_failed", { planId: plan.id, invoiceId: invoice.id, error: updErr.message });
        continue;
      }

      generated += 1;
      log("info", "invoice_generated", { planId: plan.id, invoiceId: invoice.id, dueDate });
    }

    return new Response(
      JSON.stringify({ runId, message: "ok", plansDue: plans.length, generated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    log("error", "run_failed", { error: (e as Error).message });
    return new Response(JSON.stringify({ runId, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
