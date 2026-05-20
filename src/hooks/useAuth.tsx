import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  loading: boolean;
  // Legacy fine-grained role from user_roles (admin / operator / viewer / user).
  // Used for "can mutate?" UI gates (isViewer pattern). Admin-vs-not should
  // come from useOrg().isOrgAdmin (membership-based, multi-tenant aware).
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

      // Get approval status
      const { data: profile } = await supabase
        .from("profiles")
        .select("approval_status, full_name")
        .eq("id", user.id)
        .single();

      // Get role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const userRole = roles?.length ? (roles[0].role as AuthState["role"]) : "user";

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
