import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { tNow } from "@/lib/translations";

// Drivers, driver_documents and drug_test_events are created by migrations
// 20260521140000+ but are not yet in the Supabase-generated `Database` type
// because the user regenerates types via Lovable only after applying the
// migration. Until then we use this loose builder so the TS compiler doesn't
// fight us on a table it doesn't know about. After the type regen, callers
// can be tightened to Tables<"drivers"> without API changes.
const db = supabase as unknown as {
  from: (table: string) => {
    select: (cols?: string) => any;
    insert: (row: unknown) => any;
    update: (patch: unknown) => any;
    delete: () => any;
  };
};

export interface Driver {
  id: string;
  org_id: string;
  client_id: string;
  user_id: string;
  full_name: string;
  date_of_birth: string | null;
  ssn_last4: string | null;
  phone: string | null;
  email: string | null;
  cdl_number: string | null;
  cdl_state: string | null;
  cdl_class: "A" | "B" | "C" | null;
  cdl_endorsements: string | null;
  cdl_issued_on: string | null;
  cdl_expires_on: string | null;
  medical_card_expires_on: string | null;
  medical_examiner_name: string | null;
  hire_date: string | null;
  termination_date: string | null;
  status: "active" | "inactive" | "terminated";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DriverInsert = Omit<Driver, "id" | "org_id" | "created_at" | "updated_at">;
export type DriverUpdate = Partial<Omit<Driver, "id" | "org_id" | "user_id" | "created_at" | "updated_at">>;

export function useDrivers(clientId?: string) {
  return useQuery({
    queryKey: ["drivers", clientId ?? "all"],
    queryFn: async () => {
      let q = db.from("drivers").select("*");
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q.order("full_name");
      if (error) throw new Error(error.message);
      return (data ?? []) as Driver[];
    },
  });
}

export function useDriver(id: string | undefined) {
  return useQuery({
    queryKey: ["drivers", "detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db.from("drivers").select("*").eq("id", id!).single();
      if (error) throw new Error(error.message);
      return data as Driver;
    },
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: DriverInsert) => {
      const { data, error } = await db.from("drivers").insert(input).select().single();
      if (error) throw new Error(error.message);
      return data as Driver;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast({ title: tNow("drivers.toastCreated") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: DriverUpdate }) => {
      const { data, error } = await db.from("drivers").update(patch).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as Driver;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["drivers", "detail", vars.id] });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDeleteDriver() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("drivers").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast({ title: tNow("drivers.toastRemoved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}
