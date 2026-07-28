// Shared guard for cron-only batch functions.
//
// These functions run with the service-role client over EVERY org — they have
// no per-caller scoping at all. Their only legitimate caller is pg_cron, which
// posts `Authorization: Bearer <service_role_key>` (see the cron blocks in the
// migrations). Without this guard any signed-in user of any org could trigger a
// platform-wide batch: generate-dunning, for instance, drafts collection
// messages and enqueues email.
//
// SECURITY NOTE: the role claim is read WITHOUT verifying the signature. That
// is only sound because the function gateway already verified it — every caller
// of this helper must keep `verify_jwt` at its default (true), i.e. must NOT
// appear in supabase/config.toml. The literal-key comparison below is the
// belt-and-braces path and does not depend on that.

/** Reads the `role` claim out of a JWT without verifying it. */
function roleClaim(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "="));
    return JSON.parse(json)?.role ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns a 401/403 Response when the request is not service-role, or null when
 * the caller may proceed. Usage:
 *
 *   const denied = requireServiceRole(req, corsHeaders);
 *   if (denied) return denied;
 */
export function requireServiceRole(
  req: Request,
  corsHeaders: Record<string, string>,
): Response | null {
  const deny = (status: number, error: string) =>
    new Response(JSON.stringify({ error }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return deny(401, "Missing Authorization header");

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceKey && token === serviceKey) return null;
  if (roleClaim(token) === "service_role") return null;

  return deny(403, "This function is invoked by the scheduler only");
}
