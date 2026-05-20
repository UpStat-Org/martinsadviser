import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";

// Public endpoint — Stripe calls it from the outside, no JWT. The signature
// header is what authenticates the request, validated below. Make sure
// supabase/config.toml has `verify_jwt = false` for this function.

// Mapping from Stripe subscription status → organizations.subscription_status.
// We keep Stripe's vocabulary almost 1:1; the only translation is "unpaid"
// → "suspended" because that's the term the UI gates against.
function mapSubscriptionStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
      return stripeStatus;
    case "unpaid":
    case "incomplete_expired":
      return "suspended";
    case "incomplete":
      return "past_due"; // user started checkout but didn't finish paying
    case "paused":
      return "suspended";
    default:
      console.warn("Unmapped Stripe status:", stripeStatus);
      return stripeStatus;
  }
}

async function applySubscription(
  admin: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription,
) {
  const orgId = (subscription.metadata?.org_id as string | undefined) ?? null;
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer?.id;

  // Prefer the org_id metadata; fall back to customer_id lookup if the
  // metadata is missing (e.g. subscription created outside our flow).
  let query = admin.from("organizations").update({
    stripe_subscription_id: subscription.id,
    subscription_status: mapSubscriptionStatus(subscription.status),
    trial_ends_at: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
  } as any);

  if (orgId) {
    query = query.eq("id", orgId);
  } else if (customerId) {
    query = query.eq("stripe_customer_id", customerId);
  } else {
    console.error("Subscription has no org_id metadata or customer id", subscription.id);
    return;
  }

  const { error } = await query;
  if (error) console.error("Failed to apply subscription update:", error.message);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("Stripe not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-09-30.acacia" });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  // We need the raw body string for signature verification — req.json()
  // would consume and re-stringify it, breaking the HMAC check.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Signature verification failed:", (err as Error).message);
    return new Response("Bad signature", { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // We populate organizations from the subscription update event that
        // follows — but if the user closes the tab before Stripe sends that,
        // hydrate now using whatever the session carries.
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await applySubscription(admin, sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.trial_will_end": {
        await applySubscription(admin, event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = (sub.metadata?.org_id as string | undefined) ?? null;
        const updates = {
          subscription_status: "canceled",
          stripe_subscription_id: null,
        };
        if (orgId) {
          await admin.from("organizations").update(updates as any).eq("id", orgId);
        } else if (typeof sub.customer === "string") {
          await admin.from("organizations").update(updates as any).eq("stripe_customer_id", sub.customer);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          await admin
            .from("organizations")
            .update({ subscription_status: "past_due" } as any)
            .eq("stripe_customer_id", customerId);
        }
        break;
      }
      case "invoice.payment_succeeded": {
        // Active state is reasserted from subscription.updated; we don't
        // need to do anything here for the flat-plan case.
        break;
      }
      default:
        // Acknowledge unhandled events — Stripe retries on non-2xx.
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", (err as Error).message);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
