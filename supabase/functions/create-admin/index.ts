import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { email, password } = await req.json();

  // Create user
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Admin" },
  });

  if (createError) {
    return new Response(JSON.stringify({ error: createError.message }), { status: 400 });
  }

  const userId = userData.user.id;

  // Set profile as approved
  await supabaseAdmin.from("profiles").update({ approval_status: "approved" }).eq("id", userId);

  // Assign admin role
  await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });

  return new Response(JSON.stringify({ success: true, user_id: userId }), { status: 200 });
});
