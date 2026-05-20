// ============================================================================
// Hostname → org-slug resolver
//
// Single source of truth for "what org is the user pointing at, just by
// looking at the URL?". Read once at page load (the hostname doesn't change
// mid-session), so the OrgProvider and the Login page can stay in sync.
//
// Routing convention (decided 2026-05-20):
//   - martinsadviser.com               → MartinsAdviser (cliente 0)
//   - app.martinsadviser.com           → MartinsAdviser (alias, redirect-ish)
//   - <slug>.martinsadviser.com        → tenant <slug>
//   - www.martinsadviser.com           → treated as root (MartinsAdviser)
//   - localhost / *.lovable.app /      → dev mode: no host-based org. Falls
//     *.netlify.app / IPs                back to profile.active_org_id like
//                                        before subdomains existed.
// ============================================================================

export const ROOT_ORG_SLUG = "martinsadviser";

// Subdomains that are NOT tenants — they map to the root org.
const RESERVED_SUBDOMAINS = new Set(["www", "app", "api", "admin", "status"]);

// Hosts where we don't enforce subdomain routing because they're either
// shared dev environments (lovable preview, Netlify deploys) or local.
function isDevHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return true; // raw IPv4
  if (hostname.endsWith(".lovable.app")) return true;
  if (hostname.endsWith(".lovableproject.com")) return true;
  if (hostname.endsWith(".netlify.app")) return true;
  return false;
}

export interface HostnameOrg {
  /** Slug parsed from the URL (always lowercase). null in dev mode. */
  slug: string | null;
  /** Whether subdomain routing is bypassed (dev / preview hosts). */
  isDev: boolean;
}

/**
 * Resolves the current browser hostname into a tenant slug.
 *
 * Pure function — accepts an explicit hostname for testability. In the app
 * use `getHostnameOrg()` which reads window.location.
 */
export function parseHostnameOrg(hostname: string): HostnameOrg {
  const host = hostname.toLowerCase();

  if (isDevHost(host)) {
    return { slug: null, isDev: true };
  }

  // Split off the apex domain. For "acme.martinsadviser.com" we want "acme";
  // for "martinsadviser.com" we want "" → root.
  const parts = host.split(".");
  // martinsadviser.com → 2 parts → no subdomain
  if (parts.length < 3) {
    return { slug: ROOT_ORG_SLUG, isDev: false };
  }

  const sub = parts[0];
  if (RESERVED_SUBDOMAINS.has(sub)) {
    return { slug: ROOT_ORG_SLUG, isDev: false };
  }

  return { slug: sub, isDev: false };
}

export function getHostnameOrg(): HostnameOrg {
  if (typeof window === "undefined") return { slug: null, isDev: true };
  return parseHostnameOrg(window.location.hostname);
}
