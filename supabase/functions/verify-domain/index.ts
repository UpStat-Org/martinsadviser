import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type DomainRow = {
  id: string;
  organization_id: string;
  domain: string;
  verification_token: string;
  status: string;
};

function flattenTxt(data: string): string {
  return data.replace(/^"|"$/g, "").replace(/"\s+"/g, "");
}

async function fetchTxt(name: string): Promise<string[]> {
  const url = new URL("https://cloudflare-dns.com/dns-query");
  url.searchParams.set("name", name);
  url.searchParams.set("type", "TXT");

  const res = await fetch(url, { headers: { Accept: "application/dns-json" } });
  if (!res.ok) throw new Error(`DNS lookup failed for ${name}`);

  const body = await res.json();
  return ((body.Answer ?? []) as Array<{ data?: string }>)
    .map((answer) => answer.data)
    .filter((value): value is string => typeof value === "string")
    .map(flattenTxt);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) throw new Error("Not authenticated");

    const { org_id, domain_id } = await req.json();
    if (!org_id || !domain_id) throw new Error("org_id and domain_id are required");

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: membership } = await admin
      .from("organization_members")
      .select("role")
      .eq("organization_id", org_id)
      .eq("user_id", userData.user.id)
      .eq("approval_status", "approved")
      .maybeSingle();
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new Error("Forbidden: only org admins can verify domains");
    }

    const { data: domain, error: domainErr } = await admin
      .from("organization_domains")
      .select("id, organization_id, domain, verification_token, status")
      .eq("id", domain_id)
      .eq("organization_id", org_id)
      .maybeSingle();
    if (domainErr) throw domainErr;
    if (!domain) throw new Error("Domain not found");

    const row = domain as DomainRow;
    const txtName = `_martinsadviser.${row.domain}`;
    const records = await fetchTxt(txtName);
    const verified = records.some((record) => record === row.verification_token || record.includes(row.verification_token));
    const now = new Date().toISOString();

    const { error: updateErr } = await admin
      .from("organization_domains")
      .update({
        status: verified ? "active" : row.status,
        verified_at: verified ? now : null,
        last_checked_at: now,
      })
      .eq("id", row.id);
    if (updateErr) throw updateErr;

    return new Response(
      JSON.stringify({
        verified,
        txt_name: txtName,
        expected: row.verification_token,
        records,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("verify-domain error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
