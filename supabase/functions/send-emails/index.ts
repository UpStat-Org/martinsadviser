import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireServiceRole } from "../_shared/serviceRoleGuard.ts";
import { processMessageQueue } from "../_shared/messageQueue.ts";

const headers = { "Content-Type": "application/json" };

Deno.serve(async (request) => {
  const denied = requireServiceRole(request, headers);
  if (denied) return denied;

  const runId = crypto.randomUUID();
  const log = (level: "info" | "warn" | "error", message: string, extra?: unknown) =>
    console.log(JSON.stringify({ runId, level, message, extra, timestamp: new Date().toISOString() }));

  try {
    let channel: string | undefined;
    try { channel = (await request.json())?.channel; } catch { /* cron body is optional */ }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const result = await processMessageQueue(supabase, { channel, log });
    log("info", "run_complete", result);
    return new Response(JSON.stringify({ runId, ...result }), { headers });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unknown queue error";
    log("error", "run_failed", { error: message });
    return new Response(JSON.stringify({ runId, error: message }), { status: 500, headers });
  }
});
