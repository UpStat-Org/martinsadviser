import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";

export type OrgRole = "owner" | "admin" | "member";

export interface Organization {
  id: string;
  slug: string;
  name: string;
  branding: Record<string, unknown>;
  feature_flags: Record<string, unknown>;
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

    const active = profile?.active_org_id ?? mlist[0]?.organization.id ?? null;
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

  return (
    <OrgContext.Provider
      value={{ currentOrg, memberships, isOrgOwner, isOrgAdmin, loading, switchOrg, refresh }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
