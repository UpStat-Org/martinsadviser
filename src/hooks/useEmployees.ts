import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Employee {
  id: string;
  full_name: string | null;
  email: string | null;
}

export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, approval_status")
        .eq("approval_status", "approved")
        .order("full_name");
      if (error) throw error;
      return (data ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
      })) as Employee[];
    },
    staleTime: 60_000,
  });
}

export function employeeName(emp: Pick<Employee, "full_name" | "email"> | null | undefined): string {
  if (!emp) return "—";
  return emp.full_name || emp.email || "Sem nome";
}
