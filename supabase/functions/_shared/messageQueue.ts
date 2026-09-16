import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_RETRIES = 3;
const DEFAULT_FROM = Deno.env.get("EMAIL_FROM") ?? "DotPilot <noreply@dotpilot.online>";

type Log = (level: "info" | "warn" | "error", message: string, extra?: unknown) => void;
type QueueOptions = { channel?: string; orgId?: string; log: Log };
type ClaimedMessage = {
  id: string;
  client_id: string;
  channel: string;
  subject: string | null;
  body: string;
  retry_count: number | null;
};
type ClientContact = { id: string; email: string | null; phone: string | null };

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function nextRetryDelaySeconds(retryCount: number): number {
  return Math.min(60 * Math.pow(5, retryCount), 60 * 60);
}

async function sendEmail(apiKey: string, to: string, subject: string, body: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from: DEFAULT_FROM, to: [to], subject: subject || "Notification", text: body }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Resend [${response.status}]: ${JSON.stringify(result)}`);
}

async function sendWhatsApp(apiKey: string, phone: string, body: string) {
  const response = await fetch("https://pilotstatus.online/api/v1/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      destinationNumber: phone,
      templateId: "generic_notification",
      variables: { message: body },
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`PilotStatus [${response.status}]: ${JSON.stringify(result)}`);
}

export async function processMessageQueue(
  supabase: SupabaseClient,
  { channel, orgId, log }: QueueOptions,
) {
  const rpcName = orgId ? "claim_pending_messages_for_org" : "claim_pending_messages";
  const params = orgId
    ? { p_org_id: orgId, p_limit: 50, p_channel: channel ?? null }
    : { p_limit: 50, p_channel: channel ?? null };
  const { data, error: claimError } = await supabase.rpc(rpcName, params);
  if (claimError) throw claimError;

  const claimed = (data ?? []) as ClaimedMessage[];
  if (!claimed.length) return { sent: 0, failed: 0, retried: 0, errors: [] as string[] };

  const clientIds = [...new Set(claimed.map((message) => message.client_id))];
  let clientsQuery = supabase.from("clients").select("id, email, phone").in("id", clientIds);
  if (orgId) clientsQuery = clientsQuery.eq("org_id", orgId);
  const { data: clientRows, error: clientsError } = await clientsQuery;
  if (clientsError) throw clientsError;
  const clients = new Map(((clientRows ?? []) as ClientContact[]).map((client) => [client.id, client]));

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const whatsappKey = Deno.env.get("PILOTSTATUS_API_KEY");
  let sent = 0;
  let failed = 0;
  let retried = 0;
  const errors: string[] = [];

  for (const message of claimed) {
    try {
      const client = clients.get(message.client_id);
      if (message.channel === "email") {
        if (!resendKey) throw new Error("RESEND_API_KEY not configured");
        if (!client?.email || !isValidEmail(client.email)) throw new Error("Client has no valid email");
        await sendEmail(resendKey, client.email, message.subject ?? "", message.body);
      } else if (message.channel === "whatsapp") {
        if (!whatsappKey) throw new Error("PILOTSTATUS_API_KEY not configured");
        const phone = client?.phone ? normalizePhone(client.phone) : null;
        if (!phone) throw new Error("Client has no valid phone number");
        await sendWhatsApp(whatsappKey, phone, message.body);
      } else {
        throw new Error(`Unknown channel: ${message.channel}`);
      }

      const { error } = await supabase.from("scheduled_messages").update({
        status: "sent", sent_at: new Date().toISOString(), last_error: null, locked_at: null,
      }).eq("id", message.id);
      if (error) log("warn", "mark_sent_failed", { id: message.id, error: error.message });
      sent++;
    } catch (caught) {
      const errorMessage = caught instanceof Error ? caught.message : "Unknown send error";
      const retryCount = (message.retry_count ?? 0) + 1;
      const shouldRetry = retryCount < MAX_RETRIES;
      const patch = shouldRetry
        ? {
          status: "pending", retry_count: retryCount, last_error: errorMessage,
          next_retry_at: new Date(Date.now() + nextRetryDelaySeconds(retryCount) * 1000).toISOString(),
          locked_at: null,
        }
        : { status: "failed", retry_count: retryCount, last_error: errorMessage, locked_at: null };
      await supabase.from("scheduled_messages").update(patch).eq("id", message.id);
      if (shouldRetry) retried++;
      else failed++;
      errors.push(`${message.id}: ${errorMessage}`);
      log("error", "send_failed", { id: message.id, retry: shouldRetry, attempt: retryCount, error: errorMessage });
    }
  }

  return { sent, failed, retried, errors };
}
