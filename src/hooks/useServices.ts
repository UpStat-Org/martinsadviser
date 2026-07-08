import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { tNow } from "@/lib/translations";

// services isn't in the generated types yet — cast the client (see useInsurance).
const db = supabase as unknown as {
  from: (table: string) => {
    select: (cols?: string) => any;
    insert: (row: unknown) => any;
    update: (patch: unknown) => any;
    delete: () => any;
  };
};

export type BillingType = "flat" | "monthly" | "quarterly" | "yearly";

export const BILLING_TYPES: BillingType[] = ["flat", "monthly", "quarterly", "yearly"];

export interface Service {
  id: string;
  org_id: string;
  user_id: string;
  name: string;
  description: string | null;
  default_price: number;
  billing_type: BillingType;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type ServiceInsert = {
  name: string;
  description?: string | null;
  default_price: number;
  billing_type: BillingType;
  active?: boolean;
};

export function useServices(activeOnly = false) {
  return useQuery({
    queryKey: ["services", activeOnly],
    queryFn: async () => {
      let q = db.from("services").select("*").order("name", { ascending: true });
      if (activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as Service[];
    },
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: ServiceInsert) => {
      const { data, error } = await db.from("services").insert(input).select().single();
      if (error) throw new Error(error.message);
      return data as Service;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast({ title: tNow("services.saved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ServiceInsert> & { id: string }) => {
      const { data, error } = await db.from("services").update(patch).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as Service;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast({ title: tNow("services.saved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("services").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast({ title: tNow("services.removed") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}
