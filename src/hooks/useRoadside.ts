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

export type InspectionResult = "clean" | "violations" | "oos";

export interface RoadsideInspection {
  id: string;
  org_id: string;
  client_id: string;
  truck_id: string | null;
  driver_id: string | null;
  user_id: string;
  inspection_date: string;
  location: string | null;
  state: string | null;
  inspector_id: string | null;
  inspection_level: number | null;
  result: InspectionResult;
  csa_points: number;
  violations: Array<{ code: string; description: string; oos: boolean }>;
  report_number: string | null;
  document_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type RoadsideInsert = Omit<RoadsideInspection, "id" | "org_id" | "created_at" | "updated_at">;

export function useRoadsideInspections(filters: { clientId?: string; truckId?: string; driverId?: string }) {
  return useQuery({
    queryKey: ["roadside", filters],
    enabled: !!(filters.clientId || filters.truckId || filters.driverId),
    queryFn: async () => {
      let q = db.from("roadside_inspections").select("*");
      if (filters.clientId) q = q.eq("client_id", filters.clientId);
      if (filters.truckId) q = q.eq("truck_id", filters.truckId);
      if (filters.driverId) q = q.eq("driver_id", filters.driverId);
      const { data, error } = await q.order("inspection_date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as RoadsideInspection[];
    },
  });
}

export function useCreateRoadside() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: RoadsideInsert) => {
      const { data, error } = await db.from("roadside_inspections").insert(input).select().single();
      if (error) throw new Error(error.message);
      return data as RoadsideInspection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadside"] });
      toast({ title: tNow("roadside.toastSaved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDeleteRoadside() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("roadside_inspections").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roadside"] }),
  });
}
