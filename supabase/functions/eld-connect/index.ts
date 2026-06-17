// ELD connect — stores an ELD provider credential, encrypted at rest.
//
// The browser never writes eld_connections.api_key directly any more; it calls
// this function, which (1) verifies the caller is an admin/owner of the target
// org, (2) AES-GCM encrypts the key with ELD_ENCRYPTION_KEY (same scheme as the
// portal password), and (3) upserts the connection. eld-sync decrypts with the
// same secret at run time.
//
// Body: { org_id: string, provider: "motive" | "samsara", api_key: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AES-GCM(PBKDF2) — output is base64(salt|iv|ct). Mirror of create-portal-user.
async function encryptSecret(plaintext: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 120_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext)),
  );
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(ciphertext, salt.length + iv.length);
  let bin = "";
  for (const b of combined) bin += String.fromCharCode(b);
  return btoa(bin);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const encKey = Deno.env.get("ELD_ENCRYPTION_KEY");
    if (!encKey || encKey.length < 16) return json({ error: "ELD_ENCRYPTION_KEY not configured" }, 500);

    const body = await req.json().catch(() => ({}));
    const orgId = body?.org_id as string | undefined;
    const provider = body?.provider as string | undefined;
    const apiKey = body?.api_key as string | undefined;
    if (!orgId || !provider || !apiKey) return json({ error: "org_id, provider and api_key are required" }, 400);
    if (!["motive", "samsara"].includes(provider)) return json({ error: "Unknown provider" }, 400);

    // Verify the caller is an approved admin/owner of this org.
    const authHeader = req.headers.get("Authorization") ?? "";
    const caller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await caller.auth.getClaims(authHeader.replace("Bearer ", ""));
    const callerId = claims?.claims?.sub as string | undefined;
    if (!callerId) return json({ error: "Not authenticated" }, 401);

    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", callerId)
      .eq("approval_status", "approved")
      .maybeSingle();
    if (!membership || !["owner", "admin"].includes(membership.role)) return json({ error: "Forbidden" }, 403);

    const encrypted = await encryptSecret(apiKey, encKey);

    const { error } = await supabase.from("eld_connections").upsert(
      { org_id: orgId, provider, api_key: encrypted, status: "connected", last_error: null },
      { onConflict: "org_id,provider" },
    );
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
