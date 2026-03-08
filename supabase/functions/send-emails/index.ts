import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get pending email messages whose scheduled_at has passed
    const { data: messages, error: fetchErr } = await supabase
      .from("scheduled_messages")
      .select("*, clients(company_name, email)")
      .eq("status", "pending")
      .eq("channel", "email")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(50);

    if (fetchErr) throw fetchErr;
    if (!messages?.length) {
      return new Response(
        JSON.stringify({ message: "No pending emails", sent: 0, failed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    let failed = 0;

    for (const msg of messages) {
      const client = msg.clients as any;
      const toEmail = client?.email;

      if (!toEmail) {
        // No email on client — mark as failed
        await supabase
          .from("scheduled_messages")
          .update({ status: "failed" })
          .eq("id", msg.id);
        failed++;
        continue;
      }

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Permits <onboarding@resend.dev>",
            to: [toEmail],
            subject: msg.subject || "Aviso de Vencimento",
            text: msg.body,
          }),
        });

        const result = await res.json();

        if (!res.ok) {
          console.error(`Resend error for message ${msg.id}:`, result);
          await supabase
            .from("scheduled_messages")
            .update({ status: "failed" })
            .eq("id", msg.id);
          failed++;
          continue;
        }

        await supabase
          .from("scheduled_messages")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", msg.id);
        sent++;
      } catch (sendErr) {
        console.error(`Error sending message ${msg.id}:`, sendErr);
        await supabase
          .from("scheduled_messages")
          .update({ status: "failed" })
          .eq("id", msg.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ message: "Done", sent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
