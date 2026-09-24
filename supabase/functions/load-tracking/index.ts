import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getErrorMessage } from "../_shared/errorMessage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Action = "session" | "start" | "location" | "stop";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validCoordinate(latitude: unknown, longitude: unknown) {
  return typeof latitude === "number" && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && typeof longitude === "number" && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const token = typeof body.token === "string" ? body.token : "";
    const action = body.action as Action;
    if (!token || !["session", "start", "location", "stop"].includes(action)) {
      return response({ error: "invalid_request" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const bytes = new TextEncoder().encode(token);
    const tokenHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
      .map((byte) => byte.toString(16).padStart(2, "0")).join("");

    const { data: link, error: linkError } = await admin
      .from("load_tracking_links")
      .select("id, org_id, load_id, status, expires_at, started_at, stopped_at, driver_name, loads(reference, origin_city, origin_region, destination_city, destination_region)")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (linkError) throw linkError;
    if (!link) return response({ error: "invalid_link" }, 404);

    const expired = new Date(link.expires_at) <= new Date();
    if (expired && link.status === "active") {
      await admin.from("load_tracking_links").update({ status: "expired" }).eq("id", link.id);
    }
    if (link.status !== "active" || expired) {
      return response({ error: expired ? "expired_link" : "inactive_link" }, 410);
    }

    const session = {
      status: link.started_at && !link.stopped_at ? "sharing" : "ready",
      expires_at: link.expires_at,
      driver_name: link.driver_name,
      load: link.loads,
    };
    if (action === "session") return response(session);

    if (action === "start") {
      const driverName = typeof body.driver_name === "string" ? body.driver_name.trim().slice(0, 100) : null;
      const { error } = await admin.from("load_tracking_links").update({
        driver_name: driverName || null,
        started_at: new Date().toISOString(),
        stopped_at: null,
      }).eq("id", link.id);
      if (error) throw error;
      return response({ ...session, status: "sharing", driver_name: driverName || null });
    }

    if (action === "stop") {
      const { error } = await admin.from("load_tracking_links")
        // Ending sharing also invalidates the URL. A later trip must receive a
        // fresh link rather than silently reactivating a previously shared one.
        .update({ status: "revoked", stopped_at: new Date().toISOString() }).eq("id", link.id);
      if (error) throw error;
      return response({ ...session, status: "stopped" });
    }

    if (!link.started_at || link.stopped_at || !validCoordinate(body.latitude, body.longitude)) {
      return response({ error: "location_not_allowed" }, 400);
    }
    const recordedAt = typeof body.recorded_at === "string" && !Number.isNaN(Date.parse(body.recorded_at))
      ? body.recorded_at : new Date().toISOString();
    const { error } = await admin.from("load_tracking_positions").insert({
      org_id: link.org_id,
      tracking_link_id: link.id,
      latitude: body.latitude,
      longitude: body.longitude,
      accuracy_m: typeof body.accuracy_m === "number" ? Math.max(0, body.accuracy_m) : null,
      heading: typeof body.heading === "number" && body.heading >= 0 && body.heading <= 360 ? body.heading : null,
      speed_mps: typeof body.speed_mps === "number" && body.speed_mps >= 0 ? body.speed_mps : null,
      recorded_at: recordedAt,
    });
    if (error) throw error;
    await admin.from("load_tracking_links").update({ last_seen_at: new Date().toISOString() }).eq("id", link.id);
    return response({ ok: true });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("load-tracking error:", message);
    return response({ error: "server_error" }, 500);
  }
});
