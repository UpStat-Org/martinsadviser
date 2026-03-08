import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all enabled automation rules
    const { data: rules, error: rulesErr } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("enabled", true);

    if (rulesErr) throw rulesErr;
    if (!rules?.length) {
      return new Response(JSON.stringify({ message: "No active rules", created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalCreated = 0;

    for (const rule of rules) {
      const today = new Date();
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + rule.days_before);
      const targetStr = targetDate.toISOString().split("T")[0];

      // Find permits expiring on exactly that date for this user's clients
      const { data: permits, error: permitsErr } = await supabase
        .from("permits")
        .select("*, clients(company_name, dot, mc, ein, email, phone)")
        .eq("user_id", rule.user_id)
        .eq("status", "active")
        .eq("expiration_date", targetStr);

      if (permitsErr) {
        console.error("Error fetching permits for rule", rule.id, permitsErr);
        continue;
      }
      if (!permits?.length) continue;

      for (const permit of permits) {
        // Check if we already created a message for this rule+permit
        const { data: existing } = await supabase
          .from("automation_log")
          .select("id")
          .eq("rule_id", rule.id)
          .eq("permit_id", permit.id)
          .maybeSingle();

        if (existing) continue;

        const client = permit.clients as any;
        // Replace placeholders in body and subject
        const replacePlaceholders = (text: string) =>
          text
            .replace(/\{company_name\}/g, client?.company_name || "")
            .replace(/\{dot\}/g, client?.dot || "")
            .replace(/\{mc\}/g, client?.mc || "")
            .replace(/\{ein\}/g, client?.ein || "")
            .replace(/\{email\}/g, client?.email || "")
            .replace(/\{phone\}/g, client?.phone || "")
            .replace(/\{permit_type\}/g, permit.permit_type || "")
            .replace(/\{permit_number\}/g, permit.permit_number || "")
            .replace(/\{expiration_date\}/g, permit.expiration_date || "")
            .replace(/\{state\}/g, permit.state || "")
            .replace(/\{days_before\}/g, String(rule.days_before));

        const body = replacePlaceholders(rule.body);
        const subject = rule.subject ? replacePlaceholders(rule.subject) : null;

        // Create scheduled message for now (immediate send queue)
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
          console.error("Error creating message", insertErr);
          continue;
        }

        // Log to avoid duplicates
        await supabase
          .from("automation_log")
          .insert({ rule_id: rule.id, permit_id: permit.id });

        totalCreated++;
      }
    }

    return new Response(
      JSON.stringify({ message: "Done", created: totalCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
