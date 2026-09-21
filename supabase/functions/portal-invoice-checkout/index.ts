import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";
import { getErrorMessage } from "../_shared/errorMessage.ts";
import type { Database } from "../../../src/integrations/supabase/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Authentication required");
    const token = authHeader.slice(7);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const appUrl = Deno.env.get("APP_URL") ?? "https://dotpilot.online";
    if (!stripeKey) throw new Error("Online payments are not configured");

    const admin = createClient<Database>(supabaseUrl, serviceKey);
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) throw new Error("Authentication required");

    const body = await req.json();
    const invoiceId = String(body?.invoice_id ?? "");
    if (!invoiceId) throw new Error("invoice_id is required");

    const { data: link } = await admin
      .from("client_portal_users")
      .select("client_id, org_id")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (!link) throw new Error("Portal access required");

    const { data: invoice } = await admin
      .from("invoices")
      .select("id, client_id, org_id, amount, status, description, due_date, stripe_checkout_session_id")
      .eq("id", invoiceId)
      .eq("client_id", link.client_id)
      .eq("org_id", link.org_id)
      .maybeSingle();
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status === "paid") throw new Error("Invoice is already paid");
    if (!new Set(["pending", "overdue"]).has(invoice.status)) {
      throw new Error("Invoice is not available for online payment");
    }

    const amount = Math.round(Number(invoice.amount) * 100);
    if (!Number.isSafeInteger(amount) || amount < 50) throw new Error("Invoice amount is not payable online");

    const { data: org } = await admin
      .from("organizations")
      .select("currency")
      .eq("id", link.org_id)
      .single();
    const currency = String(org?.currency ?? "USD").toLowerCase();
    if (!new Set(["usd", "brl"]).has(currency)) throw new Error("Invoice currency is not supported");

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-09-30.acacia" });
    if (invoice.stripe_checkout_session_id) {
      try {
        const existing = await stripe.checkout.sessions.retrieve(invoice.stripe_checkout_session_id);
        if (existing.status === "open" && existing.url) {
          return new Response(JSON.stringify({ url: existing.url }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (error) {
        console.warn("Could not reuse invoice checkout session:", getErrorMessage(error));
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: authData.user.email ?? undefined,
      client_reference_id: invoice.id,
      line_items: [{
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amount,
          product_data: {
            name: invoice.description || "Invoice",
            metadata: { invoice_id: invoice.id },
          },
        },
      }],
      metadata: {
        kind: "client_invoice",
        invoice_id: invoice.id,
        org_id: invoice.org_id,
        client_id: invoice.client_id,
      },
      payment_intent_data: {
        metadata: {
          kind: "client_invoice",
          invoice_id: invoice.id,
          org_id: invoice.org_id,
          client_id: invoice.client_id,
        },
      },
      success_url: `${appUrl}/portal/invoices?payment=success&invoice=${invoice.id}`,
      cancel_url: `${appUrl}/portal/invoices?payment=canceled&invoice=${invoice.id}`,
    }, {
      idempotencyKey: `portal-invoice-${invoice.id}-${amount}-${invoice.due_date}`,
    });

    const { error: updateError } = await admin
      .from("invoices")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", invoice.id);
    if (updateError) throw new Error(`Could not prepare invoice payment: ${updateError.message}`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("portal-invoice-checkout error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
