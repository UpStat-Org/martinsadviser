import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  role: "admin" | "operator" | "viewer" | "user" | null;
  approvalStatus: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    isAdmin: false,
    role: null,
    approvalStatus: null,
  });

  useEffect(() => {
    const fetchProfile = async (user: User | null) => {
      if (!user) {
        setState({ user: null, loading: false, isAdmin: false, role: null, approvalStatus: null });
        return;
      }

      // Get approval status
      const { data: profile } = await supabase
        .from("profiles")
        .select("approval_status")
        .eq("id", user.id)
        .single();

      // Get role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isAdmin = roles?.some((r) => r.role === "admin") ?? false;
      const userRole = roles?.length ? (roles[0].role as AuthState["role"]) : "user";

      setState({
        user,
        loading: false,
        isAdmin,
        role: userRole,
        approvalStatus: profile?.approval_status ?? "pending",
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
