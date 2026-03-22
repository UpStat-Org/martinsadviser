import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const results = { permits: 0, invoices: 0, tasks: 0 };

  // 1. Permits expiring in 30 days or already expired
  const { data: permits } = await supabase
    .from("permits")
    .select("id, user_id, permit_type, state, expiration_date, clients(company_name)")
    .not("expiration_date", "is", null)
    .lte("expiration_date", new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]);

  for (const p of permits ?? []) {
    const isExpired = new Date(p.expiration_date!) < new Date();
    const type = isExpired ? "permit_expired" : "permit_expiring";
    const clientName = (p as any).clients?.company_name ?? "";
    const title = isExpired
      ? `Permit ${p.permit_type} expirado`
      : `Permit ${p.permit_type} expirando`;
    const body = `${clientName}${p.state ? ` — ${p.state}` : ""} — vence em ${p.expiration_date}`;

    // Check for existing notification (avoid duplicates)
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", p.user_id)
      .eq("entity_id", p.id)
      .eq("type", type)
      .limit(1);

    if (!existing?.length) {
      await supabase.from("notifications").insert({
        user_id: p.user_id,
        type,
        title,
        body,
        entity_id: p.id,
      });
      results.permits++;
    }
  }

  // 2. Overdue invoices
  const today = new Date().toISOString().split("T")[0];
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, user_id, amount, due_date, clients(company_name)")
    .eq("status", "pending")
    .lt("due_date", today);

  for (const inv of invoices ?? []) {
    const clientName = (inv as any).clients?.company_name ?? "";
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", inv.user_id)
      .eq("entity_id", inv.id)
      .eq("type", "invoice_overdue")
      .limit(1);

    if (!existing?.length) {
      await supabase.from("notifications").insert({
        user_id: inv.user_id,
        type: "invoice_overdue",
        title: "Fatura atrasada",
        body: `${clientName} — $${inv.amount} venceu em ${inv.due_date}`,
        entity_id: inv.id,
      });
      results.invoices++;
    }
  }

  // 3. Stale tasks (not_started for 7+ days)
  const staleDate = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, user_id, name, created_at")
    .eq("status", "not_started")
    .lt("created_at", staleDate);

  for (const t of tasks ?? []) {
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", t.user_id)
      .eq("entity_id", t.id)
      .eq("type", "task_stale")
      .limit(1);

    if (!existing?.length) {
      await supabase.from("notifications").insert({
        user_id: t.user_id,
        type: "task_stale",
        title: "Tarefa parada",
        body: `"${t.name}" está pendente há mais de 7 dias`,
        entity_id: t.id,
      });
      results.tasks++;
    }
  }

  return new Response(JSON.stringify({ success: true, created: results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
