import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyState } from "../_shared/oauthState.ts";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return new Response("Missing code", { status: 400 });
    }

    // This endpoint is public (Google calls it), so the state must prove it
    // came from our own google-calendar-auth — otherwise the user_id below is
    // just whatever the caller typed into the query string.
    const userId = await verifyState(url.searchParams.get("state"));
    if (!userId) {
      return new Response("Invalid or expired state", { status: 400 });
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      return new Response(`Token exchange failed: ${JSON.stringify(tokens)}`, { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Upsert tokens
    const { error } = await supabase
      .from("google_calendar_tokens")
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        calendar_id: "primary",
      }, { onConflict: "user_id" });

    if (error) {
      return new Response(`DB error: ${error.message}`, { status: 500 });
    }

    // Redirect back to app settings
    // Falls back through APP_URL (what every other function uses) before the
    // platform domain, so the post-rebrand default matches the rest.
    const appUrl = Deno.env.get("SITE_URL") || Deno.env.get("APP_URL") || "https://dotpilot.online";
    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}/settings?gcal=connected` },
    });
  } catch (error) {
    return new Response(`Error: ${(error as Error).message}`, { status: 500 });
  }
});
