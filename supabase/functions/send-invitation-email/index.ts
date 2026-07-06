import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Sends the org invitation email via Resend. The owner already created the
// invitation row via invite_member; this just hydrates the data, builds a
// branded HTML email and ships it. Calling this twice for the same
// invitation is harmless — Resend treats each call as a separate send.
//
// Authorization: caller must be authenticated AND an admin/owner of the
// org the invitation belongs to. We re-check server-side instead of
// trusting the frontend.

const DEFAULT_FROM = Deno.env.get("INVITATION_EMAIL_FROM")
  ?? Deno.env.get("EMAIL_FROM")
  ?? "DotPilot <noreply@upstat.online>";

function htmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function renderHtml(opts: {
  orgName: string;
  inviterName: string | null;
  role: string;
  inviteUrl: string;
  primaryColor: string;
}): string {
  const { orgName, inviterName, role, inviteUrl, primaryColor } = opts;
  const inviter = inviterName ? htmlEscape(inviterName) : "Um membro da equipe";
  const safeOrg = htmlEscape(orgName);
  return `<!doctype html>
<html><body style="margin:0;padding:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f5f6fa;color:#0b0d2e">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 0;background:#f5f6fa">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" width="520" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(11,13,46,0.08)">
      <tr><td style="padding:32px 32px 12px">
        <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:${primaryColor};font-weight:700;margin-bottom:8px">Convite</div>
        <h1 style="margin:0;font-size:24px;line-height:1.25;color:#0b0d2e">Você foi convidado pra ${safeOrg}</h1>
        <p style="margin:14px 0 0;font-size:15px;line-height:1.55;color:#4a4e6a">
          ${inviter} te adicionou como <strong>${htmlEscape(role)}</strong> em <strong>${safeOrg}</strong>.
          Clique no botão abaixo pra aceitar e entrar na organização.
        </p>
      </td></tr>
      <tr><td align="center" style="padding:8px 32px 24px">
        <a href="${inviteUrl}" style="display:inline-block;background:${primaryColor};color:#fff;text-decoration:none;font-weight:600;padding:13px 28px;border-radius:10px;font-size:15px">
          Aceitar convite
        </a>
      </td></tr>
      <tr><td style="padding:8px 32px 28px">
        <div style="font-size:12px;line-height:1.55;color:#7c80a0">
          Se o botão não funcionar, abra este link no navegador:<br>
          <span style="word-break:break-all;color:#0b0d2e">${htmlEscape(inviteUrl)}</span>
        </div>
        <hr style="margin:24px 0;border:none;border-top:1px solid #ecedf3">
        <div style="font-size:11px;color:#a4a8c4">
          Este convite expira em 7 dias. Se você não esperava receber, pode ignorar.
        </div>
      </td></tr>
    </table>
    <div style="margin-top:16px;font-size:11px;color:#a4a8c4">Powered by DotPilot</div>
  </td></tr>
</table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization header");
    const token = authHeader.replace("Bearer ", "");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_URL") ?? "https://dotpilot.online";

    // Authenticate the caller (cheap, no extra round-trip).
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await callerClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) throw new Error("Not authenticated");
    const callerId = claimsData.claims.sub as string;

    const { invitation_id } = await req.json();
    if (!invitation_id) throw new Error("invitation_id is required");

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: inv, error: invErr } = await admin
      .from("organization_invitations")
      .select("id, email, role, token, expires_at, organization_id, invited_by")
      .eq("id", invitation_id)
      .maybeSingle();
    if (invErr || !inv) throw new Error("invitation not found");

    // Authorize: caller must be admin/owner of the invitation's org.
    const { data: membership } = await admin
      .from("organization_members")
      .select("role")
      .eq("organization_id", inv.organization_id)
      .eq("user_id", callerId)
      .eq("approval_status", "approved")
      .maybeSingle();
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new Error("Forbidden: org admin role required");
    }

    const [{ data: org }, { data: inviterProfile }] = await Promise.all([
      admin.from("organizations").select("name, branding").eq("id", inv.organization_id).maybeSingle(),
      inv.invited_by
        ? admin.from("profiles").select("full_name").eq("id", inv.invited_by).maybeSingle()
        : Promise.resolve({ data: null as { full_name: string | null } | null }),
    ]);
    if (!org) throw new Error("org not found");

    const branding = (org as { branding?: Record<string, unknown> }).branding ?? {};
    const primaryColor = (typeof (branding as Record<string, unknown>).primary_color === "string"
      && /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test((branding as Record<string, string>).primary_color))
      ? ((branding as Record<string, string>).primary_color.startsWith("#")
          ? (branding as Record<string, string>).primary_color
          : `#${(branding as Record<string, string>).primary_color}`)
      : "#5B7BFF";

    const inviteUrl = `${appUrl}/invite/${inv.token}`;
    const html = renderHtml({
      orgName: org.name,
      inviterName: inviterProfile?.full_name ?? null,
      role: inv.role,
      inviteUrl,
      primaryColor,
    });

    const subject = `Convite pra ${org.name}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: DEFAULT_FROM,
        to: [inv.email],
        subject,
        html,
      }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Resend [${res.status}]: ${JSON.stringify(result)}`);
    }

    return new Response(JSON.stringify({ sent: true, to: inv.email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-invitation-email error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
