import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { user_id } = await req.json();
    if (!user_id) throw new Error("user_id is required");
    if (user_id === caller.id) throw new Error("Cannot delete yourself");

    // Resolve caller's active org (the one the action is scoped to)
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("active_org_id")
      .eq("id", caller.id)
      .maybeSingle();
    const orgId = callerProfile?.active_org_id;
    if (!orgId) throw new Error("Caller has no active organization");

    // Caller must be admin/owner of that org
    const { data: callerMembership } = await adminClient
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", caller.id)
      .eq("approval_status", "approved")
      .maybeSingle();
    if (!callerMembership || !["owner", "admin"].includes(callerMembership.role)) {
      throw new Error("Forbidden: org admin role required");
    }

    // Target user must belong to the same org
    const { data: targetMembership } = await adminClient
      .from("organization_members")
      .select("user_id, role")
      .eq("organization_id", orgId)
      .eq("user_id", user_id)
      .maybeSingle();
    if (!targetMembership) throw new Error("Target user is not a member of this organization");
    // Prevent deleting the org owner
    if (targetMembership.role === "owner") throw new Error("Cannot delete the organization owner");

    // Delete membership for this org first (explicit, not relying on cascade ordering)
    await adminClient
      .from("organization_members")
      .delete()
      .eq("organization_id", orgId)
      .eq("user_id", user_id);

    // If the user has no other memberships, remove profile + auth user.
    // Otherwise keep their global identity intact (they still belong to another org).
    const { data: otherMemberships } = await adminClient
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user_id)
      .limit(1);

    if (!otherMemberships || otherMemberships.length === 0) {
      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      await adminClient.from("profiles").delete().eq("id", user_id);
      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
