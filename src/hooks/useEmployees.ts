import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export interface Employee {
  id: string;
  full_name: string | null;
  email: string | null;
}

// Approved members of the CURRENT org only. Goes through list_org_members
// (SECURITY DEFINER, validates is_org_member) instead of a global SELECT on
// profiles — a direct profiles query leaks users from other tenants to anyone
// holding the legacy global 'admin' role.
export function useEmployees() {
  const { currentOrg } = useOrg();
  return useQuery({
    queryKey: ["employees", currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_org_members", { p_org_id: currentOrg!.id });
      if (error) throw error;
      return ((data ?? []) as Array<{ user_id: string; full_name: string | null; email: string | null; approval_status: string }>)
        .filter((m) => m.approval_status === "approved")
        .map((m) => ({ id: m.user_id, full_name: m.full_name, email: m.email }))
        .sort((a, b) => (a.full_name || a.email || "").localeCompare(b.full_name || b.email || "")) as Employee[];
    },
    staleTime: 60_000,
  });
}

export function employeeName(emp: Pick<Employee, "full_name" | "email"> | null | undefined): string {
  if (!emp) return "—";
  return emp.full_name || emp.email || "Sem nome";
}
