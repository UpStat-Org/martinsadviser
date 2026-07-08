import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { tNow } from "@/lib/translations";

// recurring_plans isn't in the generated types yet — cast (see useInsurance).
const db = supabase as unknown as {
  from: (table: string) => {
    select: (cols?: string) => any;
    insert: (row: unknown) => any;
    update: (patch: unknown) => any;
    delete: () => any;
  };
};

export type PlanFrequency = "monthly" | "quarterly" | "yearly";
export type PlanStatus = "active" | "paused" | "cancelled";

export const PLAN_FREQUENCIES: PlanFrequency[] = ["monthly", "quarterly", "yearly"];

export interface RecurringPlan {
  id: string;
  org_id: string;
  user_id: string;
  client_id: string;
  service_id: string | null;
  name: string;
  amount: number;
  frequency: PlanFrequency;
  net_days: number;
  next_run_on: string;
  status: PlanStatus;
  description: string | null;
  last_invoice_on: string | null;
  invoices_generated: number;
  created_at: string;
  updated_at: string;
  clients?: { company_name: string } | null;
}

export type RecurringPlanInsert = {
  client_id: string;
  service_id?: string | null;
  name: string;
  amount: number;
  frequency: PlanFrequency;
  net_days?: number;
  next_run_on: string;
  status?: PlanStatus;
  description?: string | null;
};

export function useRecurringPlans(clientId?: string) {
  return useQuery({
    queryKey: ["recurring_plans", clientId ?? "all"],
    queryFn: async () => {
      let q = db
        .from("recurring_plans")
        .select("*, clients(company_name)")
        .order("next_run_on", { ascending: true });
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as RecurringPlan[];
    },
  });
}

export function useCreateRecurringPlan() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: RecurringPlanInsert) => {
      const { data, error } = await db.from("recurring_plans").insert(input).select().single();
      if (error) throw new Error(error.message);
      return data as RecurringPlan;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring_plans"] });
      toast({ title: tNow("recurring.saved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useUpdateRecurringPlan() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<RecurringPlanInsert> & { id: string }) => {
      const { data, error } = await db.from("recurring_plans").update(patch).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as RecurringPlan;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring_plans"] });
      toast({ title: tNow("recurring.saved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDeleteRecurringPlan() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("recurring_plans").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring_plans"] });
      toast({ title: tNow("recurring.removed") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}
