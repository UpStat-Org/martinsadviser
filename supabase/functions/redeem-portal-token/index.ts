import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mirrors the encryption in create-portal-user. Input is base64(salt|iv|ct);
// derives the same key from PORTAL_ENCRYPTION_KEY and PBKDF2(SHA-256).
async function decryptPassword(payload: string, secret: string): Promise<string> {
  const bin = atob(payload);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  const salt = bytes.slice(0, 16);
  const iv = bytes.slice(16, 28);
  const ciphertext = bytes.slice(28);

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(secret), "PBKDF2", false, ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 120_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(plaintext);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const encryptionKey = Deno.env.get("PORTAL_ENCRYPTION_KEY");
    if (!encryptionKey || encryptionKey.length < 16) {
      throw new Error("PORTAL_ENCRYPTION_KEY not configured");
    }

    const { token } = await req.json();
    if (!token) throw new Error("Missing token");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: link, error: linkErr } = await adminClient
      .from("client_portal_users")
      .select("user_id, initial_password_encrypted, access_token_expires_at")
      .eq("access_token", token)
      .maybeSingle();

    if (linkErr) throw linkErr;
    if (!link || !link.initial_password_encrypted) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (link.access_token_expires_at && new Date(link.access_token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "expired_token" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve the auth user's email via service role.
    const { data: userData, error: userErr } =
      await adminClient.auth.admin.getUserById(link.user_id);
    if (userErr || !userData?.user?.email) throw new Error("Portal user not found");

    const password = await decryptPassword(link.initial_password_encrypted, encryptionKey);

    return new Response(
      JSON.stringify({ email: userData.user.email, password }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("redeem-portal-token error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
