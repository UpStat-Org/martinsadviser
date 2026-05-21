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

export interface CsaSnapshot {
  id: string;
  org_id: string;
  client_id: string;
  user_id: string;
  measurement_period: string;
  unsafe_driving: number | null;
  hours_of_service: number | null;
  driver_fitness: number | null;
  controlled_substances: number | null;
  vehicle_maintenance: number | null;
  hazmat_compliance: number | null;
  crash_indicator: number | null;
  notes: string | null;
  created_at: string;
}

export type CsaSnapshotInsert = Omit<CsaSnapshot, "id" | "org_id" | "created_at">;

export function useCsaSnapshots(clientId: string | undefined) {
  return useQuery({
    queryKey: ["csa_snapshots", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await db
        .from("csa_snapshots")
        .select("*")
        .eq("client_id", clientId!)
        .order("measurement_period", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as CsaSnapshot[];
    },
  });
}

export function useUpsertCsaSnapshot() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: CsaSnapshotInsert) => {
      const { data, error } = await db
        .from("csa_snapshots")
        .upsert(input, { onConflict: "client_id,measurement_period" })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as CsaSnapshot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["csa_snapshots"] });
      toast({ title: tNow("csa.toastSaved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDeleteCsaSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("csa_snapshots").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["csa_snapshots"] }),
  });
}
