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
    .select("id, user_id, org_id, permit_type, state, expiration_date, clients(company_name)")
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
        org_id: p.org_id,
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
    .select("id, user_id, org_id, amount, due_date, clients(company_name)")
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
        org_id: inv.org_id,
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
    .select("id, user_id, org_id, name, created_at")
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
        org_id: t.org_id,
        type: "task_stale",
        title: "Tarefa parada",
        body: `"${t.name}" está pendente há mais de 7 dias`,
        entity_id: t.id,
      });
      results.tasks++;
    }
  }

  // ── 4. MCS-150 biennial updates coming due ────────────────────────────────
  // FMCSA derives the next-due month from the USDOT number:
  //   - last digit  → month (1=Jan ... 9=Sep, 0=Oct)
  //   - 2nd-to-last → odd years (odd digit) or even years (even digit)
  // If the carrier already filed (mcs_150_last_filed_at is set), the next due
  // is just lastFiled + 24 months. We emit when ≤ 90 days remain.

  const monthByLastDigit: Record<string, number> = {
    "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5,
    "7": 6, "8": 7, "9": 8, "0": 9,
  };

  function nextMcs150Due(dot: string, lastFiledAt: string | null, ref: Date): Date | null {
    if (lastFiledAt) {
      const d = new Date(lastFiledAt);
      return new Date(Date.UTC(d.getUTCFullYear() + 2, d.getUTCMonth(), d.getUTCDate()));
    }
    const digits = dot.replace(/\D/g, "");
    if (digits.length < 2) return null;
    const last = digits[digits.length - 1];
    const nextToLast = digits[digits.length - 2];
    const month = monthByLastDigit[last];
    if (month === undefined) return null;
    const wantsOdd = parseInt(nextToLast, 10) % 2 === 1;
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

  const refNow = new Date();
  const { data: clientsForMcs } = await supabase
    .from("clients")
    .select("id, user_id, org_id, company_name, dot, mcs_150_last_filed_at")
    .not("dot", "is", null)
    .neq("dot", "");

  let mcsCreated = 0;
  for (const c of clientsForMcs ?? []) {
    const due = nextMcs150Due(
      String(c.dot ?? ""),
      (c as { mcs_150_last_filed_at: string | null }).mcs_150_last_filed_at,
      refNow,
    );
    if (!due) continue;
    const days = Math.ceil((due.getTime() - refNow.getTime()) / 86_400_000);
    if (days > 90) continue;

    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", c.user_id)
      .eq("entity_id", c.id)
      .eq("type", "mcs150_due")
      .limit(1);
    if (existing?.length) continue;

    const title =
      days < 0
        ? `MCS-150 ATRASADO há ${Math.abs(days)} dias`
        : `MCS-150 vence em ${days} dias`;
    const body = `${c.company_name} — DOT ${c.dot} · prazo ${due.toISOString().slice(0, 10)}`;

    await supabase.from("notifications").insert({
      user_id: c.user_id,
      org_id: c.org_id,
      type: "mcs150_due",
      title,
      body,
      entity_id: c.id,
    });
    mcsCreated++;
  }

  return new Response(JSON.stringify({ success: true, created: { ...results, mcs150: mcsCreated } }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
