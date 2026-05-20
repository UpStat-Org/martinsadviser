// ============================================================================
// Hostname → org-slug resolver
//
// Single source of truth for "what org is the user pointing at, just by
// looking at the URL?". Read once at page load (the hostname doesn't change
// mid-session), so the OrgProvider and the Login page can stay in sync.
//
// Routing convention:
//   - <slug>.martinsadviser.com        → tenant <slug> — strict enforcement
//                                        (signs out users who aren't members)
//   - martinsadviser.com (apex)        → permissive mode: pick the user's
//                                        profile.active_org_id, never force
//                                        a sign-out. Lets owners of any org
//                                        get into the app while the wildcard
//                                        DNS / SSL setup is still pending.
//   - www / app / api / admin / status → reserved subdomains, treated as apex.
//   - localhost / *.lovable.app /      → dev mode, same permissive behavior.
//     *.netlify.app / IPs
// ============================================================================

const RESERVED_SUBDOMAINS = new Set(["www", "app", "api", "admin", "status"]);

function isDevHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return true; // raw IPv4
  if (hostname.endsWith(".lovable.app")) return true;
  if (hostname.endsWith(".lovableproject.com")) return true;
  if (hostname.endsWith(".netlify.app")) return true;
  return false;
}

export interface HostnameOrg {
  /** Slug parsed from the URL (always lowercase). null = no strict scoping. */
  slug: string | null;
  /** Whether host-based enforcement is off (dev hosts, previews, or apex). */
  isDev: boolean;
}

/**
 * Resolves the current browser hostname into a tenant slug. Returns
 * `slug=null` when there's no real subdomain to enforce against.
 */
export function parseHostnameOrg(hostname: string): HostnameOrg {
  const host = hostname.toLowerCase();
  if (isDevHost(host)) return { slug: null, isDev: true };

  const parts = host.split(".");
  // Apex (martinsadviser.com / example.com): no subdomain to bind to. Treat
  // as permissive — the OrgProvider will fall back to active_org_id and
  // never sign a user out because of where they typed the URL.
  if (parts.length < 3) return { slug: null, isDev: true };

  const sub = parts[0];
  if (RESERVED_SUBDOMAINS.has(sub)) return { slug: null, isDev: true };

  return { slug: sub, isDev: false };
}

export function getHostnameOrg(): HostnameOrg {
  if (typeof window === "undefined") return { slug: null, isDev: true };
  return parseHostnameOrg(window.location.hostname);
}
