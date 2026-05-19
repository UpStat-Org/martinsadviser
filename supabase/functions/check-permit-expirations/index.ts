import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function computeTargetDate(daysBefore: number): string {
  // Trabalha em UTC+0 de forma explícita para bater com DATE armazenado no banco.
  // expiration_date é DATE (sem hora) — comparamos YYYY-MM-DD em UTC.
  const now = new Date();
  const target = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysBefore,
  ));
  return target.toISOString().slice(0, 10);
}

function makeReplacer(client: Record<string, unknown>, permit: Record<string, unknown>, daysBefore: number) {
  const map: Record<string, string> = {
    "{company_name}": String(client?.company_name ?? ""),
    "{dot}": String(client?.dot ?? ""),
    "{mc}": String(client?.mc ?? ""),
    "{ein}": String(client?.ein ?? ""),
    "{email}": String(client?.email ?? ""),
    "{phone}": String(client?.phone ?? ""),
    "{permit_type}": String(permit?.permit_type ?? ""),
    "{permit_number}": String(permit?.permit_number ?? ""),
    "{expiration_date}": String(permit?.expiration_date ?? ""),
    "{state}": String(permit?.state ?? ""),
    "{days_before}": String(daysBefore),
  };
  return (text: string) =>
    text.replace(/\{[a-z_]+\}/g, (m) => (m in map ? map[m] : m));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const runId = crypto.randomUUID();
  const log = (level: "info" | "warn" | "error", msg: string, extra?: unknown) => {
    console.log(JSON.stringify({ runId, level, msg, extra, ts: new Date().toISOString() }));
  };

  try {
    const { data: rules, error: rulesErr } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("enabled", true);

    if (rulesErr) throw rulesErr;
    if (!rules?.length) {
      return new Response(JSON.stringify({ runId, message: "No active rules", created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalCreated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const rule of rules) {
      const targetStr = computeTargetDate(rule.days_before);

      const { data: permits, error: permitsErr } = await supabase
        .from("permits")
        .select("*, clients(company_name, dot, mc, ein, email, phone)")
        .eq("user_id", rule.user_id)
        .eq("status", "active")
        .eq("expiration_date", targetStr);

      if (permitsErr) {
        log("error", "fetch_permits_failed", { ruleId: rule.id, error: permitsErr.message });
        totalErrors++;
        continue;
      }
      if (!permits?.length) continue;

      for (const permit of permits) {
        // DEDUPE-FIRST: insere automation_log antes da mensagem.
        // UNIQUE(rule_id, permit_id) garante idempotência mesmo em execução concorrente.
        const { error: logErr } = await supabase
          .from("automation_log")
          .insert({ rule_id: rule.id, permit_id: permit.id, org_id: permit.org_id });

        if (logErr) {
          // 23505 = unique_violation → já processado, pular silenciosamente.
          if ((logErr as { code?: string }).code === "23505") {
            totalSkipped++;
            continue;
          }
          log("error", "automation_log_insert_failed", { ruleId: rule.id, permitId: permit.id, error: logErr.message });
          totalErrors++;
          continue;
        }

        const client = permit.clients as Record<string, unknown> | null;
        const replace = makeReplacer(client ?? {}, permit, rule.days_before);
        const body = replace(rule.body);
        const subject = rule.subject ? replace(rule.subject) : null;

        const { error: insertErr } = await supabase
          .from("scheduled_messages")
          .insert({
            user_id: rule.user_id,
            client_id: permit.client_id,
            template_id: rule.template_id,
            channel: rule.channel,
            subject,
            body,
            scheduled_at: new Date().toISOString(),
            status: "pending",
          });

        if (insertErr) {
          // Reverte o automation_log para permitir retry no próximo tick.
          await supabase
            .from("automation_log")
            .delete()
            .eq("rule_id", rule.id)
            .eq("permit_id", permit.id);
          log("error", "scheduled_message_insert_failed", { ruleId: rule.id, permitId: permit.id, error: insertErr.message });
          totalErrors++;
          continue;
        }

        // Cria tarefa no Kanban se ainda não existir.
        const taskName = `Renovar ${permit.permit_type} - ${client?.company_name ?? ""}`;
        const priority = rule.days_before <= 15 ? "high" : rule.days_before <= 30 ? "medium" : "low";

        const { data: existingTask, error: taskLookupErr } = await supabase
          .from("tasks")
          .select("id")
          .eq("user_id", rule.user_id)
          .eq("client_id", permit.client_id)
          .eq("task_type", permit.permit_type)
          .in("status", ["not_started", "waiting", "in_progress"])
          .maybeSingle();

        if (taskLookupErr) {
          log("warn", "task_lookup_failed", { permitId: permit.id, error: taskLookupErr.message });
        } else if (!existingTask) {
          const { error: taskErr } = await supabase.from("tasks").insert({
            user_id: rule.user_id,
            org_id: permit.org_id,
            client_id: permit.client_id,
            name: taskName,
            task_type: permit.permit_type,
            status: "not_started",
            priority,
            due_date: permit.expiration_date,
            notes: `[Auto] Task criada automaticamente. Permit #${permit.permit_number || "—"} vence em ${permit.expiration_date}.`,
          });
          if (taskErr) {
            log("warn", "task_insert_failed", { permitId: permit.id, error: taskErr.message });
          }
        }

        totalCreated++;
      }
    }

    if (totalCreated > 0) {
      try {
        const r = await fetch(`${supabaseUrl}/functions/v1/send-emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: "{}",
        });
        if (!r.ok) {
          log("warn", "send_emails_trigger_non_2xx", { status: r.status });
        }
      } catch (e) {
        log("warn", "send_emails_trigger_failed", { error: (e as Error).message });
      }
    }

    log("info", "run_complete", { created: totalCreated, skipped: totalSkipped, errors: totalErrors });

    return new Response(
      JSON.stringify({ runId, message: "Done", created: totalCreated, skipped: totalSkipped, errors: totalErrors }),
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
