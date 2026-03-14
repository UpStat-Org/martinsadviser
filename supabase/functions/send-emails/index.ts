import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendEmail(resendApiKey: string, toEmail: string, subject: string, body: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "Permits <onboarding@resend.dev>",
      to: [toEmail],
      subject: subject || "Aviso de Vencimento",
      text: body,
    }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(`Resend error: ${JSON.stringify(result)}`);
  return result;
}

async function sendWhatsApp(apiKey: string, phone: string, body: string, templateId?: string) {
  const payload: Record<string, unknown> = {
    destinationNumber: phone.startsWith("+") ? phone : `+${phone}`,
  };
  
  if (templateId) {
    payload.templateId = templateId;
    payload.variables = { message: body };
  } else {
    // Use a generic template or send raw text
    payload.templateId = "generic_notification";
    payload.variables = { message: body };
  }

  const res = await fetch("https://pilotstatus.online/api/v1/messages/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });
  
  const result = await res.json();
  if (!res.ok) throw new Error(`PilotStatus error [${res.status}]: ${JSON.stringify(result)}`);
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const pilotStatusApiKey = Deno.env.get("PILOTSTATUS_API_KEY");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Optionally filter by channel from request body
    let channelFilter: string | undefined;
    try {
      const body = await req.json();
      channelFilter = body?.channel;
    } catch { /* no body is fine */ }

    // Get pending messages whose scheduled_at has passed
    let query = supabase
      .from("scheduled_messages")
      .select("*, clients(company_name, email, phone)")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(50);

    if (channelFilter) {
      query = query.eq("channel", channelFilter);
    }

    const { data: messages, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    if (!messages?.length) {
      return new Response(
        JSON.stringify({ message: "No pending messages", sent: 0, failed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const msg of messages) {
      const client = msg.clients as any;

      try {
        if (msg.channel === "email") {
          if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");
          const toEmail = client?.email;
          if (!toEmail) throw new Error("Client has no email");
          await sendEmail(resendApiKey, toEmail, msg.subject || "", msg.body);
        } else if (msg.channel === "whatsapp") {
          if (!pilotStatusApiKey) throw new Error("PILOTSTATUS_API_KEY not configured");
          const phone = client?.phone;
          if (!phone) throw new Error("Client has no phone number");
          await sendWhatsApp(pilotStatusApiKey, phone, msg.body);
        } else if (msg.channel === "sms") {
          throw new Error("SMS channel not configured");
        } else {
          throw new Error(`Unknown channel: ${msg.channel}`);
        }

        await supabase
          .from("scheduled_messages")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", msg.id);
        sent++;
      } catch (sendErr: any) {
        console.error(`Error sending message ${msg.id} (${msg.channel}):`, sendErr);
        errors.push(`${msg.id}: ${sendErr.message}`);
        await supabase
          .from("scheduled_messages")
          .update({ status: "failed" })
          .eq("id", msg.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ message: "Done", sent, failed, errors: errors.length ? errors : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
