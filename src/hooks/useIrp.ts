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
    upsert: (row: unknown, opts?: unknown) => any;
  };
};

export interface IrpRegistration {
  id: string;
  org_id: string;
  client_id: string;
  user_id: string;
  registration_year: number;
  base_jurisdiction: string;
  total_fleet_miles: number;
  fleet_size: number;
  status: "draft" | "filed" | "paid";
  filed_at: string | null;
  total_fee: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IrpJurisdictionLine {
  id: string;
  org_id: string;
  registration_id: string;
  jurisdiction: string;
  miles: number;
  percentage: number | null;
  fee: number | null;
  created_at: string;
}

export type IrpRegistrationInsert = Omit<IrpRegistration, "id" | "org_id" | "created_at" | "updated_at">;

export function useIrpRegistrations(filters?: { clientId?: string; year?: number }) {
  return useQuery({
    queryKey: ["irp_registrations", filters],
    queryFn: async () => {
      let q = db.from("irp_registrations").select("*");
      if (filters?.clientId) q = q.eq("client_id", filters.clientId);
      if (filters?.year) q = q.eq("registration_year", filters.year);
      const { data, error } = await q.order("registration_year", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as IrpRegistration[];
    },
  });
}

export function useIrpLines(registrationId: string | undefined) {
  return useQuery({
    queryKey: ["irp_lines", registrationId],
    enabled: !!registrationId,
    queryFn: async () => {
      const { data, error } = await db
        .from("irp_jurisdiction_lines")
        .select("*")
        .eq("registration_id", registrationId!)
        .order("jurisdiction");
      if (error) throw new Error(error.message);
      return (data ?? []) as IrpJurisdictionLine[];
    },
  });
}

export function useUpsertIrpRegistration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: IrpRegistrationInsert) => {
      const { data, error } = await db
        .from("irp_registrations")
        .upsert(input, { onConflict: "client_id,registration_year" })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as IrpRegistration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["irp_registrations"] });
      toast({ title: tNow("irp.toastRegSaved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useUpsertIrpLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { registration_id: string; jurisdiction: string; miles: number; percentage: number | null; fee: number | null }) => {
      const { data, error } = await db
        .from("irp_jurisdiction_lines")
        .upsert(input, { onConflict: "registration_id,jurisdiction" })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as IrpJurisdictionLine;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["irp_lines", vars.registration_id] });
    },
  });
}

export function useDeleteIrpLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("irp_jurisdiction_lines").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["irp_lines"] }),
  });
}
