import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { tNow } from "@/lib/translations";

const db = supabase as unknown as {
  from: (table: string) => {
    select: (cols?: string) => any;
    insert: (row: unknown) => any;
    update: (patch: unknown) => any;
    delete: () => any;
  };
};

export interface HvutFiling {
  id: string;
  org_id: string;
  truck_id: string;
  client_id: string;
  user_id: string;
  tax_year: number;
  first_used_month: string | null;
  taxable_gross_weight_lbs: number | null;
  suspended: boolean;
  tax_amount: number | null;
  status: "pending" | "filed" | "paid" | "amended";
  filed_at: string | null;
  irs_confirmation: string | null;
  schedule_1_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type HvutFilingInsert = Omit<HvutFiling, "id" | "org_id" | "created_at" | "updated_at">;
export type HvutFilingUpdate = Partial<Omit<HvutFiling, "id" | "org_id" | "user_id" | "created_at" | "updated_at">>;

export function useHvutFilings(filters?: { truckId?: string; clientId?: string; taxYear?: number }) {
  return useQuery({
    queryKey: ["hvut_filings", filters],
    queryFn: async () => {
      let q = db.from("hvut_filings").select("*");
      if (filters?.truckId) q = q.eq("truck_id", filters.truckId);
      if (filters?.clientId) q = q.eq("client_id", filters.clientId);
      if (filters?.taxYear) q = q.eq("tax_year", filters.taxYear);
      const { data, error } = await q.order("tax_year", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as HvutFiling[];
    },
  });
}

export function useCreateHvutFiling() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: HvutFilingInsert) => {
      const { data, error } = await db.from("hvut_filings").insert(input).select().single();
      if (error) throw new Error(error.message);
      return data as HvutFiling;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hvut_filings"] });
      toast({ title: tNow("hvut.toastSaved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useUpdateHvutFiling() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: HvutFilingUpdate }) => {
      const { data, error } = await db.from("hvut_filings").update(patch).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as HvutFiling;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hvut_filings"] }),
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}
