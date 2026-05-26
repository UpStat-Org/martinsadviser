import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_FROM = Deno.env.get("INVITATION_EMAIL_FROM")
  ?? Deno.env.get("EMAIL_FROM")
  ?? "MartinsAdviser <noreply@upstat.online>";

const ACCESS_TOKEN_TTL_DAYS = 7;

// AES-GCM with PBKDF2(SHA-256) derivation. Output is base64(salt|iv|ct)
// so we can decrypt without ever storing the secret alongside the data.
// The matching decryptPassword lives in redeem-portal-token.
async function encryptPassword(plaintext: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(secret), "PBKDF2", false, ["deriveKey"],
  );
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

// 16-char random password with a mix of letters/digits/symbols.
// Crypto-strong (Uint32Array via getRandomValues), no Math.random.
function generatePassword(length = 16): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
  const buf = new Uint32Array(length);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[buf[i] % alphabet.length];
  return out;
}

function htmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function renderEmailHtml(opts: {
  orgName: string;
  email: string;
  accessUrl: string;
  primaryColor: string;
}): string {
  const { orgName, email, accessUrl, primaryColor } = opts;
  const safeOrg = htmlEscape(orgName);
  const safeEmail = htmlEscape(email);
  return `<!doctype html>
<html><body style="margin:0;padding:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f5f6fa;color:#0b0d2e">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 0;background:#f5f6fa">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" width="520" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(11,13,46,0.08)">
      <tr><td style="padding:32px 32px 12px">
        <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:${primaryColor};font-weight:700;margin-bottom:8px">Client Portal</div>
        <h1 style="margin:0;font-size:24px;line-height:1.25;color:#0b0d2e">Your portal access is ready</h1>
        <p style="margin:14px 0 0;font-size:15px;line-height:1.55;color:#4a4e6a">
          <strong>${safeOrg}</strong> has given you portal access to view your permits, trucks, and documents in real time.
        </p>
        <p style="margin:14px 0 0;font-size:15px;line-height:1.55;color:#4a4e6a">
          Access linked to the email <strong>${safeEmail}</strong>.
        </p>
      </td></tr>
      <tr><td align="center" style="padding:16px 32px 24px">
        <a href="${accessUrl}" style="display:inline-block;background:${primaryColor};color:#fff;text-decoration:none;font-weight:600;padding:13px 28px;border-radius:10px;font-size:15px">
          Access Portal
        </a>
      </td></tr>
      <tr><td style="padding:8px 32px 28px">
        <div style="font-size:12px;line-height:1.55;color:#7c80a0">
          If the button doesn't work, open this link in your browser:<br>
          <span style="word-break:break-all;color:#0b0d2e">${htmlEscape(accessUrl)}</span>
        </div>
        <hr style="margin:24px 0;border:none;border-top:1px solid #ecedf3">
        <div style="font-size:11px;color:#a4a8c4">
          This link expires in ${ACCESS_TOKEN_TTL_DAYS} days. If you weren't expecting this email, you can ignore it.
        </div>
      </td></tr>
    </table>
    <div style="margin-top:16px;font-size:11px;color:#a4a8c4">Powered by MartinsAdviser</div>
  </td></tr>
</table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const encryptionKey = Deno.env.get("PORTAL_ENCRYPTION_KEY");
    const appUrl = Deno.env.get("APP_URL") ?? "https://martinsadviser.com";

    if (!resendKey) throw new Error("RESEND_API_KEY not configured");
    if (!encryptionKey || encryptionKey.length < 16) {
      throw new Error("PORTAL_ENCRYPTION_KEY not configured (need >= 16 chars)");
    }

    // Verify caller
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Not authenticated");

    const callerId = claimsData.claims.sub as string;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { email, client_id } = await req.json();
    if (!email || !client_id) throw new Error("Missing required fields");

    // Resolve client + org
    const { data: client, error: clientErr } = await adminClient
      .from("clients")
      .select("org_id, company_name")
      .eq("id", client_id)
      .maybeSingle();
    if (clientErr || !client) throw new Error("Client not found");

    // Authorize caller
    const { data: callerMembership } = await adminClient
      .from("organization_members")
      .select("role")
      .eq("organization_id", client.org_id)
      .eq("user_id", callerId)
      .eq("approval_status", "approved")
      .maybeSingle();
    if (!callerMembership || !["owner", "admin"].includes(callerMembership.role)) {
      throw new Error("Not authorized");
    }

    // Generate password and create auth user (auto-confirmed)
    const password = generatePassword(16);
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) throw createError;

    // Encrypt password and prepare access token
    const encrypted = await encryptPassword(password, encryptionKey);
    const accessToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { error: linkError } = await adminClient
      .from("client_portal_users")
      .insert({
        user_id: newUser.user.id,
        client_id,
        org_id: client.org_id,
        initial_password_encrypted: encrypted,
        access_token: accessToken,
        access_token_expires_at: expiresAt,
      });
    if (linkError) throw linkError;

    // Fetch org branding for email accent color
    const { data: org } = await adminClient
      .from("organizations")
      .select("name, branding")
      .eq("id", client.org_id)
      .maybeSingle();
    const branding = (org?.branding as Record<string, unknown> | null) ?? {};
    const rawColor = typeof branding.primary_color === "string" ? branding.primary_color : "";
    const primaryColor = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(rawColor)
      ? (rawColor.startsWith("#") ? rawColor : `#${rawColor}`)
      : "#5B7BFF";

    const accessUrl = `${appUrl}/portal/login?access=${accessToken}`;
    const orgName = org?.name ?? client.company_name ?? "Portal";

    const subject = `Portal access — ${orgName}`;
    const html = renderEmailHtml({ orgName, email, accessUrl, primaryColor });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: DEFAULT_FROM,
        to: [email],
        subject,
        html,
      }),
    });
    const resendResult = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Resend [${res.status}]: ${JSON.stringify(resendResult)}`);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id, sent_to: email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("create-portal-user error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
