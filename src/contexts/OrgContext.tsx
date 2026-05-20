import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { getHostnameOrg } from "@/lib/orgHost";
import { applyBrandingColors } from "@/lib/color";

export type OrgRole = "owner" | "admin" | "member";

export const FEATURE_FLAGS = [
  "messages",
  "calendar",
  "ai_chat",
  "ai_reports",
  "finance",
  "portal",
  "automations",
  "audit_log",
] as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

// Safe defaults when a flag is missing from organizations.feature_flags.
// Matches the column DEFAULT (all on) so an org that predates a newly
// introduced flag still behaves as expected.
const FLAG_DEFAULTS: Record<FeatureFlag, boolean> = {
  messages: true,
  calendar: true,
  ai_chat: true,
  ai_reports: true,
  finance: true,
  portal: true,
  automations: true,
  audit_log: true,
};

export interface OrgBranding {
  app_name: string;
  tagline: string;
  logo_url: string | null;
  /** Hex like "#5B7BFF". Null means use the default theme. */
  primary_color: string | null;
  /** Hex like "#F59E0B". Drives the amber highlight + wordmark bar. */
  accent_color: string | null;
}

// Fallback brand used when:
//   - there's no org loaded yet (apex, pre-auth)
//   - an org row has empty branding AND we have no other name to use
// New orgs DON'T default to MartinsAdviser anymore — see parseBranding.
const FALLBACK_APP_NAME = "MartinsAdviser";
const FALLBACK_TAGLINE = "Adviser";

function parseBranding(raw: unknown, fallbackName?: string | null): OrgBranding {
  const obj = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const storedAppName = typeof obj.app_name === "string" && obj.app_name.length > 0 ? obj.app_name : null;
  const storedTagline = typeof obj.tagline === "string" ? obj.tagline : null;
  // When we fall back to the org's company name, use a blank tagline so
  // the wordmark renders single-line. Only the operator brand (no
  // fallbackName at all) gets the "Adviser" subtitle by default.
  const usingOrgName = !storedAppName && !!fallbackName;

  return {
    app_name: storedAppName ?? fallbackName ?? FALLBACK_APP_NAME,
    tagline: storedTagline ?? (usingOrgName ? "" : FALLBACK_TAGLINE),
    logo_url: typeof obj.logo_url === "string" && obj.logo_url.length > 0 ? obj.logo_url : null,
    primary_color: typeof obj.primary_color === "string" && obj.primary_color.length > 0 ? obj.primary_color : null,
    accent_color: typeof obj.accent_color === "string" && obj.accent_color.length > 0 ? obj.accent_color : null,
  };
}


/**
 * Splits the app name into a 2-line wordmark when the tagline is a suffix
 * of the app name (e.g. "MartinsAdviser" + "Adviser" → "Martins" / "Adviser").
 * For orgs that just set app_name without a tagline, returns the name as
 * primary and an empty secondary — the Wordmark will render a single line.
 */
export function splitWordmark(branding: OrgBranding): { primary: string; secondary: string } {
  const { app_name, tagline } = branding;
  if (tagline && app_name.toLowerCase().endsWith(tagline.toLowerCase()) && app_name.length > tagline.length) {
    const primary = app_name.slice(0, app_name.length - tagline.length).trim();
    return { primary: primary || app_name, secondary: tagline };
  }
  return { primary: app_name, secondary: tagline };
}

export interface Organization {
  id: string;
  slug: string;
  name: string;
  branding: Record<string, unknown>;
  feature_flags: Partial<Record<FeatureFlag, boolean>>;
  subscription_status?: string;
}

export interface Membership {
  organization: Organization;
  role: OrgRole;
}

interface OrgContextValue {
  currentOrg: Organization | null;
  memberships: Membership[];
  isOrgOwner: boolean;
  isOrgAdmin: boolean;
  features: Record<FeatureFlag, boolean>;
  hasFeature: (flag: FeatureFlag) => boolean;
  branding: OrgBranding;
  loading: boolean;
  switchOrg: (orgId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMemberships([]);
      setCurrentOrgId(null);
      setLoading(false);
      return;
    }

    const [{ data: memberRows }, { data: profile }] = await Promise.all([
      supabase
        .from("organization_members")
        .select("role, approval_status, organization:organizations(*)")
        .eq("user_id", user.id)
        .eq("approval_status", "approved"),
      supabase
        .from("profiles")
        .select("active_org_id")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    const mlist: Membership[] = (memberRows ?? [])
      .filter((r: any) => r.organization)
      .map((r: any) => ({
        organization: r.organization as Organization,
        role: r.role as OrgRole,
      }));

    // Host-based routing: when the URL points at a tenant subdomain (or the
    // root, which maps to the cliente 0 slug), that's the only org the user
    // can be in for this session. Cross-tenant access is denied even if the
    // user has memberships in other orgs.
    const hostInfo = getHostnameOrg();
    let active: string | null = null;

    if (hostInfo.slug && !hostInfo.isDev) {
      const matched = mlist.find((m) => m.organization.slug === hostInfo.slug);
      if (matched) {
        active = matched.organization.id;
        // Keep profile.active_org_id in sync so OrgSwitcher and other surfaces
        // agree with the URL. Fire-and-forget — failing this isn't fatal.
        if (profile?.active_org_id !== matched.organization.id) {
          supabase.from("profiles")
            .update({ active_org_id: matched.organization.id })
            .eq("id", user.id)
            .then(() => undefined);
        }
      } else {
        // User is signed in but not a member of the org this URL serves.
        // Sign them out so they don't see a half-loaded UI, then send them
        // to /login on the same host with an explanatory query param.
        await supabase.auth.signOut();
        if (typeof window !== "undefined") {
          window.location.assign(`/login?error=cross_org&host=${encodeURIComponent(hostInfo.slug)}`);
        }
        setMemberships([]);
        setCurrentOrgId(null);
        setLoading(false);
        return;
      }
    } else {
      // Dev / preview host: fall back to the profile's preferred org.
      active = profile?.active_org_id ?? mlist[0]?.organization.id ?? null;
    }

    setMemberships(mlist);
    setCurrentOrgId(active);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setMemberships([]);
        setCurrentOrgId(null);
        setLoading(false);
        return;
      }
      refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  const switchOrg = useCallback(async (orgId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const isMember = memberships.some((m) => m.organization.id === orgId);
    if (!isMember) throw new Error("Not a member of that organization");

    await supabase.from("profiles").update({ active_org_id: orgId }).eq("id", user.id);
    await supabase.auth.refreshSession();
    setCurrentOrgId(orgId);
    // Hard reload so every query reruns with the new JWT/org context.
    window.location.reload();
  }, [memberships]);

  const currentMembership = memberships.find((m) => m.organization.id === currentOrgId);
  const currentOrg = currentMembership?.organization ?? null;
  const isOrgOwner = currentMembership?.role === "owner";
  const isOrgAdmin = currentMembership?.role === "owner" || currentMembership?.role === "admin";

  const features = FEATURE_FLAGS.reduce((acc, flag) => {
    const raw = currentOrg?.feature_flags?.[flag];
    acc[flag] = typeof raw === "boolean" ? raw : FLAG_DEFAULTS[flag];
    return acc;
  }, {} as Record<FeatureFlag, boolean>);

  const hasFeature = (flag: FeatureFlag) => features[flag];

  const branding = parseBranding(currentOrg?.branding, currentOrg?.name);

  // Mirror the org's app_name into the browser tab. Keeping this in the
  // provider (rather than on every page) means it stays in sync after
  // switchOrg without each consumer remembering to update.
  useEffect(() => {
    if (typeof document !== "undefined" && currentOrg) {
      document.title = branding.app_name;
    }
  }, [branding.app_name, currentOrg]);

  // Override the shadcn theme variables when the org sets custom colors.
  // Cleanup runs on unmount so toggling back to null restores the stylesheet
  // defaults without a page reload.
  useEffect(() => {
    applyBrandingColors({ primary: branding.primary_color, accent: branding.accent_color });
    return () => applyBrandingColors({ primary: null, accent: null });
  }, [branding.primary_color, branding.accent_color]);

  return (
    <OrgContext.Provider
      value={{ currentOrg, memberships, isOrgOwner, isOrgAdmin, features, hasFeature, branding, loading, switchOrg, refresh }}
    >
      {children}
    </OrgContext.Provider>
  );
}

// Shortcut hook: returns whether the given feature is enabled for the
// current org. While org is still loading or there's no active org, returns
// `false` to fail closed.
export function useFeatureFlag(flag: FeatureFlag): boolean {
  const { hasFeature, currentOrg, loading } = useOrg();
  if (loading || !currentOrg) return false;
  return hasFeature(flag);
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
