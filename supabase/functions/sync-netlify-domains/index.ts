import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireServiceRole } from "../_shared/serviceRoleGuard.ts";
import { getErrorMessage } from "../_shared/errorMessage.ts";

// ---------------------------------------------------------------------------
// Netlify domain-alias reconciler.
//
// Every tenant reaches the app at <slug>.dotpilot.online. Netlify routes by
// Host header, so a subdomain 404s until it is registered as a domain alias on
// the site — the wildcard `*.dotpilot.online` would avoid this, but Netlify
// only enables wildcard routing for paid teams, so we register one alias per
// org instead.
//
// This function does NOT take "add alias X" as input. It recomputes the whole
// desired set from the database and PATCHes that. Two reasons:
//
//   1) Netlify's PATCH replaces `domain_aliases` wholesale — there is no
//      append. A read-modify-write per org would drop other tenants' aliases
//      whenever two orgs are created concurrently. Deriving the full set from
//      the DB makes the write idempotent and race-free.
//   2) Orgs are created down three different paths (the handle_new_user signup
//      trigger, super_admin_create_org, public_create_org_with_owner). A
//      reconciler covers all of them, plus backfills anything created while
//      this function was broken or not yet deployed.
//
// Invoked by an AFTER INSERT trigger on public.organizations (immediate) and
// by cron (safety net). Service-role only — see requireServiceRole.
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mirrors RESERVED_SUBDOMAINS in src/lib/orgHost.ts. These never belong to a
// tenant, and `www` is served by a Netlify-managed DNS record rather than an
// alias — pruning must leave them alone if they ever show up in the list.
const RESERVED_SUBDOMAINS = new Set(["www", "app", "api", "admin", "status"]);

/** `https://dotpilot.online` → `dotpilot.online`. */
function apexFromUrl(raw: string): string {
  return raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "").toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const denied = requireServiceRole(req, corsHeaders);
  if (denied) return denied;

  const runId = crypto.randomUUID();
  const log = (level: "info" | "warn" | "error", msg: string, extra?: unknown) => {
    console.log(JSON.stringify({ runId, level, msg, extra, ts: new Date().toISOString() }));
  };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const netlifyToken = Deno.env.get("NETLIFY_AUTH_TOKEN");
    const siteId = Deno.env.get("NETLIFY_SITE_ID");
    const apex = apexFromUrl(Deno.env.get("APP_URL") ?? "https://dotpilot.online");

    if (!netlifyToken) throw new Error("NETLIFY_AUTH_TOKEN not configured");
    if (!siteId) throw new Error("NETLIFY_SITE_ID not configured");

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // --- desired set -------------------------------------------------------
    const { data: orgs, error: orgsErr } = await admin.from("organizations").select("slug");
    if (orgsErr) throw orgsErr;

    const tenantHosts = (orgs ?? [])
      .map((o: { slug: string }) => (o.slug ?? "").trim().toLowerCase())
      .filter((slug: string) => slug && !RESERVED_SUBDOMAINS.has(slug))
      .map((slug: string) => `${slug}.${apex}`);

    // Verified custom domains are separate hostnames (acme.com), so they need
    // an alias too — they live outside the apex namespace and are therefore
    // never pruned by the rule below.
    const { data: customDomains, error: domainsErr } = await admin
      .from("organization_domains")
      .select("domain, status")
      .eq("status", "active");
    if (domainsErr) throw domainsErr;

    const customHosts = (customDomains ?? [])
      .map((d: { domain: string }) => (d.domain ?? "").trim().toLowerCase())
      .filter(Boolean);

    const desired = new Set([...tenantHosts, ...customHosts]);

    // --- current state -----------------------------------------------------
    const siteUrl = `https://api.netlify.com/api/v1/sites/${siteId}`;
    const getRes = await fetch(siteUrl, {
      headers: { Authorization: `Bearer ${netlifyToken}` },
    });
    if (!getRes.ok) {
      throw new Error(`Netlify getSite failed: ${getRes.status} ${await getRes.text()}`);
    }
    const site = await getRes.json();
    const current: string[] = (site.domain_aliases ?? []).map((h: string) => h.toLowerCase());

    // --- merge -------------------------------------------------------------
    // Keep every alias we don't own. We only prune inside our own namespace
    // (<sub>.<apex>) and only when the slug no longer maps to an org, so a
    // manually added alias — or a reserved subdomain — always survives.
    const kept = current.filter((host) => {
      if (desired.has(host)) return true;
      if (!host.endsWith(`.${apex}`)) return true;
      const sub = host.slice(0, -(apex.length + 1));
      return sub.includes(".") || RESERVED_SUBDOMAINS.has(sub);
    });

    const merged = [...new Set([...kept, ...desired])].sort();
    const pruned = current.filter((h) => !merged.includes(h));
    const added = merged.filter((h) => !current.includes(h));

    if (added.length === 0 && pruned.length === 0) {
      log("info", "already in sync", { total: merged.length });
      return new Response(
        JSON.stringify({ changed: false, total: merged.length, added: [], pruned: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const patchRes = await fetch(siteUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${netlifyToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ domain_aliases: merged }),
    });
    if (!patchRes.ok) {
      throw new Error(`Netlify updateSite failed: ${patchRes.status} ${await patchRes.text()}`);
    }

    log("info", "aliases synced", { added, pruned, total: merged.length });

    return new Response(
      JSON.stringify({ changed: true, total: merged.length, added, pruned }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const message = getErrorMessage(e);
    log("error", "sync-netlify-domains failed", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
