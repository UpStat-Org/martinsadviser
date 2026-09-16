import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { processMessageQueue } from "../_shared/messageQueue.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });
  }

  const runId = crypto.randomUUID();
  const log = (level: "info" | "warn" | "error", message: string, extra?: unknown) =>
    console.log(JSON.stringify({ runId, level, message, extra, timestamp: new Date().toISOString() }));

  try {
    const authorization = request.headers.get("Authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });

    const url = Deno.env.get("SUPABASE_URL")!;
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: claims, error: claimsError } = await caller.auth.getClaims(token);
    const userId = claims?.claims?.sub;
    if (claimsError || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    const body = await request.json().catch(() => null);
    const orgId = body?.org_id;
    if (typeof orgId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId)) {
      return new Response(JSON.stringify({ error: "Valid org_id required" }), { status: 400, headers: jsonHeaders });
    }
    const channel = body?.channel;
    if (channel !== undefined && channel !== "email" && channel !== "whatsapp") {
      return new Response(JSON.stringify({ error: "Unsupported channel" }), { status: 400, headers: jsonHeaders });
    }

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await admin.from("profiles").select("active_org_id").eq("id", userId).maybeSingle();
    if (!profile?.active_org_id || profile.active_org_id !== orgId) {
      return new Response(JSON.stringify({ error: "Organization does not match active session" }), { status: 403, headers: jsonHeaders });
    }

    const { data: membership } = await admin
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .eq("approval_status", "approved")
      .maybeSingle();
    if (!membership || membership.role === "viewer") {
      return new Response(JSON.stringify({ error: "Write access required" }), { status: 403, headers: jsonHeaders });
    }

    const result = await processMessageQueue(admin, { channel, orgId, log });
    log("info", "org_run_complete", { orgId, ...result });
    return new Response(JSON.stringify({ runId, ...result }), { headers: jsonHeaders });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unknown queue error";
    log("error", "org_run_failed", { error: message });
    return new Response(JSON.stringify({ runId, error: message }), { status: 500, headers: jsonHeaders });
  }
});
