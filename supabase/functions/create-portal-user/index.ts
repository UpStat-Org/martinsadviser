import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Verify caller using getClaims
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Not authenticated");

    const callerId = claimsData.claims.sub as string;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { email, password, client_id } = await req.json();
    if (!email || !password || !client_id) throw new Error("Missing required fields");

    // Resolve the client's org (the source of truth for the portal user's tenancy)
    const { data: client, error: clientErr } = await adminClient
      .from("clients")
      .select("org_id")
      .eq("id", client_id)
      .maybeSingle();
    if (clientErr || !client) throw new Error("Client not found");

    // Caller must be an admin/owner of the client's org
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

    // Create auth user with auto-confirm
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) throw createError;

    // Link to client (org_id must be passed explicitly — current_org_id() default
    // resolves via auth.uid()/JWT, which is unavailable under service_role).
    const { error: linkError } = await adminClient
      .from("client_portal_users")
      .insert({ user_id: newUser.user.id, client_id, org_id: client.org_id });
    if (linkError) throw linkError;

    return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
