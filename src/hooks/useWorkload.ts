import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AssignedPermitRow {
  id: string;
  permit_type: string;
  state: string | null;
  expiration_date: string | null;
  status: string;
  assigned_to: string | null;
  client_id: string;
  clients?: { company_name: string } | null;
}

export interface AssignedTaskRow {
  id: string;
  name: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  assigned_to: string | null;
  client_id: string | null;
  operator: string | null;
  clients?: { company_name: string } | null;
}

export function useAssignedPermits(userId: string | undefined) {
  return useQuery({
    queryKey: ["assigned_permits", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("permits")
        .select("id, permit_type, state, expiration_date, status, assigned_to, client_id, clients(company_name)")
        .eq("assigned_to", userId!)
        .order("expiration_date", { ascending: true });
      if (error) throw error;
      return data as AssignedPermitRow[];
    },
  });
}

export function useAssignedTasks(userId: string | undefined) {
  return useQuery({
    queryKey: ["assigned_tasks", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tasks")
        .select("id, name, status, priority, due_date, assigned_to, client_id, operator, clients(company_name)")
        .eq("assigned_to", userId!)
        .neq("status", "completed")
        .neq("status", "discarded")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as AssignedTaskRow[];
    },
  });
}

// All assigned for workload dashboard
export function useAllAssignments() {
  return useQuery({
    queryKey: ["all_assignments"],
    queryFn: async () => {
      const [permitsRes, tasksRes] = await Promise.all([
        (supabase as any)
          .from("permits")
          .select("id, expiration_date, status, assigned_to"),
        (supabase as any)
          .from("tasks")
          .select("id, status, due_date, assigned_to, updated_at, created_at"),
      ]);
      if (permitsRes.error) throw permitsRes.error;
      if (tasksRes.error) throw tasksRes.error;
      return {
        permits: permitsRes.data as Array<{ id: string; expiration_date: string | null; status: string; assigned_to: string | null }>,
        tasks: tasksRes.data as Array<{ id: string; status: string; due_date: string | null; assigned_to: string | null; updated_at: string; created_at: string }>,
      };
    },
  });
}
