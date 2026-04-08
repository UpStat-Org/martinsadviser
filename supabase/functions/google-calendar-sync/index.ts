import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function refreshTokenIfNeeded(supabase: any, tokenRow: any) {
  const now = new Date();
  const expiresAt = new Date(tokenRow.expires_at);

  if (now < expiresAt) return tokenRow.access_token;

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokenRow.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to refresh token");

  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  await supabase
    .from("google_calendar_tokens")
    .update({ access_token: data.access_token, expires_at: newExpiresAt })
    .eq("user_id", tokenRow.user_id);

  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabaseAuth.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const userId = claimsData.claims.sub;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get tokens
    const { data: tokenRow, error: tokenErr } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (tokenErr || !tokenRow) {
      return new Response(JSON.stringify({ error: "Google Calendar not connected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await refreshTokenIfNeeded(supabase, tokenRow);

    // Get active permits with expiration dates
    const { data: permits, error: permitsErr } = await supabase
      .from("permits")
      .select("*, clients(company_name)")
      .eq("user_id", userId)
      .eq("status", "active")
      .not("expiration_date", "is", null);

    if (permitsErr) throw permitsErr;

    let created = 0;
    const calendarId = tokenRow.calendar_id || "primary";

    for (const permit of permits || []) {
      const client = permit.clients as any;
      const summary = `${permit.permit_type} - ${client?.company_name || "N/A"}`;
      const description = [
        `Permit #: ${permit.permit_number || "N/A"}`,
        `State: ${permit.state || "N/A"}`,
        `Status: ${permit.status}`,
      ].join("\n");

      const event = {
        summary,
        description,
        start: { date: permit.expiration_date },
        end: { date: permit.expiration_date },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 30 * 24 * 60 },
            { method: "popup", minutes: 7 * 24 * 60 },
          ],
        },
      };

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );

      if (res.ok) created++;
    }

    return new Response(
      JSON.stringify({ message: "Sync complete", created, total: permits?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
