import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Returns a one-shot Stripe Billing Portal URL the owner can open to
// manage payment method, view invoices, or cancel. Stripe handles the UI;
// any change comes back to us via the webhook.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization header");
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const appUrl = Deno.env.get("APP_URL") ?? "https://dotpilot.online";

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await callerClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) throw new Error("Not authenticated");
    const callerId = claimsData.claims.sub as string;

    const { org_id } = await req.json();
    if (!org_id) throw new Error("org_id is required");

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: membership } = await admin
      .from("organization_members")
      .select("role")
      .eq("organization_id", org_id)
      .eq("user_id", callerId)
      .eq("approval_status", "approved")
      .maybeSingle();
    if (!membership || membership.role !== "owner") {
      throw new Error("Forbidden: only the org owner can manage billing");
    }

    const { data: org } = await admin
      .from("organizations")
      .select("stripe_customer_id, is_master_org")
      .eq("id", org_id)
      .maybeSingle();
    if ((org as { is_master_org?: boolean } | null)?.is_master_org) {
      throw new Error("This organization is the platform operator and does not have billing.");
    }
    if (!org?.stripe_customer_id) {
      throw new Error("This organization has no Stripe customer yet. Start a subscription first.");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-09-30.acacia" });
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${appUrl}/settings?billing=returned`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("stripe-billing-portal error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
