import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_RETRIES = 3;
const DEFAULT_FROM = Deno.env.get("EMAIL_FROM") ?? "Permits <noreply@upstat.online>";

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function nextRetryDelaySeconds(retryCount: number): number {
  // Backoff exponencial: 1min, 5min, 25min.
  return Math.min(60 * Math.pow(5, retryCount), 60 * 60);
}

async function sendEmail(resendApiKey: string, toEmail: string, subject: string, body: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: DEFAULT_FROM,
      to: [toEmail],
      subject: subject || "Aviso de Vencimento",
      text: body,
    }),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend [${res.status}]: ${JSON.stringify(result)}`);
  return result;
}

async function sendWhatsApp(apiKey: string, phone: string, body: string) {
  const res = await fetch("https://pilotstatus.online/api/v1/messages/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      destinationNumber: phone,
      templateId: "generic_notification",
      variables: { message: body },
    }),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`PilotStatus [${res.status}]: ${JSON.stringify(result)}`);
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const pilotStatusApiKey = Deno.env.get("PILOTSTATUS_API_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const runId = crypto.randomUUID();
  const log = (level: "info" | "warn" | "error", msg: string, extra?: unknown) => {
    console.log(JSON.stringify({ runId, level, msg, extra, ts: new Date().toISOString() }));
  };

  try {
    let channelFilter: string | undefined;
    try {
      const body = await req.json();
      channelFilter = body?.channel;
    } catch { /* sem body é ok */ }

    // claim_pending_messages: marca linhas como 'sending' atomicamente (FOR UPDATE SKIP LOCKED).
    // Garante que execuções paralelas nunca peguem a mesma mensagem.
    const { data: claimed, error: claimErr } = await supabase.rpc("claim_pending_messages", {
      p_limit: 50,
      p_channel: channelFilter ?? null,
    });
    if (claimErr) throw claimErr;

    if (!claimed?.length) {
      return new Response(
        JSON.stringify({ runId, message: "No pending messages", sent: 0, failed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Busca dados do cliente em um único round-trip.
    const clientIds = [...new Set(claimed.map((m) => m.client_id))];
    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, company_name, email, phone")
      .in("id", clientIds);
    const clientsById = new Map((clientsData ?? []).map((c) => [c.id, c]));

    let sent = 0;
    let failed = 0;
    let retried = 0;
    const errors: string[] = [];

    for (const msg of claimed) {
      const client = clientsById.get(msg.client_id);

      try {
        if (msg.channel === "email") {
          if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");
          const toEmail = client?.email;
          if (!toEmail) throw new Error("Client has no email");
          if (!isValidEmail(toEmail)) throw new Error(`Invalid email format: ${toEmail}`);
          await sendEmail(resendApiKey, toEmail, msg.subject || "", msg.body);
        } else if (msg.channel === "whatsapp") {
          if (!pilotStatusApiKey) throw new Error("PILOTSTATUS_API_KEY not configured");
          const rawPhone = client?.phone;
          if (!rawPhone) throw new Error("Client has no phone number");
          const phone = normalizePhone(rawPhone);
          if (!phone) throw new Error(`Invalid phone format: ${rawPhone}`);
          await sendWhatsApp(pilotStatusApiKey, phone, msg.body);
        } else if (msg.channel === "sms") {
          throw new Error("SMS channel not configured");
        } else {
          throw new Error(`Unknown channel: ${msg.channel}`);
        }

        const { error: updErr } = await supabase
          .from("scheduled_messages")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            last_error: null,
            locked_at: null,
          })
          .eq("id", msg.id);
        if (updErr) log("warn", "mark_sent_failed", { id: msg.id, error: updErr.message });
        sent++;
      } catch (sendErr) {
        const errMsg = (sendErr as Error).message;
        const newCount = (msg.retry_count ?? 0) + 1;
        const shouldRetry = newCount < MAX_RETRIES;

        if (shouldRetry) {
          const nextRetry = new Date(Date.now() + nextRetryDelaySeconds(newCount) * 1000);
          await supabase
            .from("scheduled_messages")
            .update({
              status: "pending",
              retry_count: newCount,
              last_error: errMsg,
              next_retry_at: nextRetry.toISOString(),
              locked_at: null,
            })
            .eq("id", msg.id);
          retried++;
        } else {
          await supabase
            .from("scheduled_messages")
            .update({
              status: "failed",
              retry_count: newCount,
              last_error: errMsg,
              locked_at: null,
            })
            .eq("id", msg.id);
          failed++;
        }
        errors.push(`${msg.id}: ${errMsg}`);
        log("error", "send_failed", { id: msg.id, channel: msg.channel, retry: shouldRetry, attempt: newCount, error: errMsg });
      }
    }

    log("info", "run_complete", { claimed: claimed.length, sent, failed, retried });

    return new Response(
      JSON.stringify({ runId, message: "Done", sent, failed, retried, errors: errors.length ? errors : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    log("error", "run_failed", { error: (error as Error).message });
    return new Response(
      JSON.stringify({ runId, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
