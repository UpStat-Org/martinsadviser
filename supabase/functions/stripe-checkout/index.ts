import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Creates a Stripe Checkout session for the caller's active organization.
// The caller MUST be owner of the org — only owners decide to subscribe.
// Idempotency: if the org already has a stripe_customer_id we reuse it so
// Stripe binds the new subscription to the same customer (preserves billing
// history, default card, etc).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization header");
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const priceId = Deno.env.get("STRIPE_PRICE_ID");
    const appUrl = Deno.env.get("APP_URL") ?? "https://martinsadviser.com";

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    if (!priceId) throw new Error("STRIPE_PRICE_ID not configured");

    // Verify the caller via getClaims (cheap, no extra round-trip).
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await callerClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) throw new Error("Not authenticated");
    const callerId = claimsData.claims.sub as string;
    const callerEmail = (claimsData.claims.email as string | undefined) ?? "";

    const { org_id } = await req.json();
    if (!org_id) throw new Error("org_id is required");

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Authorization: caller must be an approved owner of this org.
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
      .select("id, name, stripe_customer_id, stripe_subscription_id, is_master_org")
      .eq("id", org_id)
      .maybeSingle();
    if (!org) throw new Error("Organization not found");

    // Master orgs (e.g. cliente 0) are exempt from billing — refuse politely
    // so the UI can show its "no charge" card without surprises.
    if ((org as { is_master_org?: boolean }).is_master_org) {
      throw new Error("This organization is the platform operator and does not require a subscription.");
    }

    if (org.stripe_subscription_id) {
      throw new Error("This organization already has an active subscription. Use the billing portal to manage it.");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-09-30.acacia" });

    // Reuse customer if we know about one; otherwise create + persist.
    let customerId = org.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: callerEmail || undefined,
        name: org.name,
        metadata: { org_id: org.id },
      });
      customerId = customer.id;
      const { error: updErr } = await admin
        .from("organizations")
        .update({ stripe_customer_id: customerId })
        .eq("id", org.id);
      if (updErr) {
        // Surface the failure — orphan customers in Stripe are a pain.
        throw new Error(`Failed to persist customer id: ${updErr.message}`);
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // org_id duplicated on both session and subscription so the webhook
      // can recover the org even if the customer→org mapping is stale.
      metadata: { org_id: org.id },
      subscription_data: {
        metadata: { org_id: org.id },
      },
      success_url: `${appUrl}/settings?billing=success`,
      cancel_url: `${appUrl}/settings?billing=canceled`,
      allow_promotion_codes: true,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("stripe-checkout error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
