import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  loading: boolean;
  // UI projection of the active organization membership. Authorization is
  // enforced independently by RLS through can_org_write(org_id).
  role: "admin" | "operator" | "viewer" | "user" | null;
  approvalStatus: string | null;
  fullName: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    role: null,
    approvalStatus: null,
    fullName: null,
  });

  useEffect(() => {
    const fetchProfile = async (user: User | null) => {
      if (!user) {
        setState({ user: null, loading: false, role: null, approvalStatus: null, fullName: null });
        return;
      }

      // Get approval status and the active organization. Fine-grained roles
      // are organization-scoped; the legacy global user_roles table is not an
      // authorization source anymore.
      const { data: profile } = await supabase
        .from("profiles")
        .select("approval_status, full_name, active_org_id")
        .eq("id", user.id)
        .single();

      const { data: membership } = profile?.active_org_id
        ? await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", profile.active_org_id)
        .eq("user_id", user.id)
        .eq("approval_status", "approved")
        .maybeSingle()
        : { data: null };

      const orgRole = membership?.role as string | undefined;
      const userRole: AuthState["role"] =
        orgRole === "owner" || orgRole === "admin"
          ? "admin"
          : orgRole === "operator"
            ? "operator"
            : orgRole === "viewer"
              ? "viewer"
              : "user";

      setState({
        user,
        loading: false,
        role: userRole,
        approvalStatus: profile?.approval_status ?? "pending",
        fullName: profile?.full_name ?? null,
      });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchProfile(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfile(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
