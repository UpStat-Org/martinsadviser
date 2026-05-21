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

export type MaintenanceType =
  | "dot_annual_inspection"
  | "oil_change"
  | "brake_service"
  | "tire_service"
  | "engine_repair"
  | "transmission_service"
  | "preventive_maintenance"
  | "electrical"
  | "other";

export interface MaintenanceRecord {
  id: string;
  org_id: string;
  truck_id: string;
  user_id: string;
  service_date: string;
  service_type: MaintenanceType;
  mileage: number | null;
  vendor: string | null;
  cost: number | null;
  next_due_at: string | null;
  document_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type MaintenanceInsert = Omit<MaintenanceRecord, "id" | "org_id" | "created_at" | "updated_at">;

export const MAINTENANCE_TYPES: MaintenanceType[] = [
  "dot_annual_inspection",
  "oil_change",
  "brake_service",
  "tire_service",
  "engine_repair",
  "transmission_service",
  "preventive_maintenance",
  "electrical",
  "other",
];

export function useMaintenanceRecords(truckId: string | undefined) {
  return useQuery({
    queryKey: ["maintenance", truckId],
    enabled: !!truckId,
    queryFn: async () => {
      const { data, error } = await db
        .from("maintenance_records")
        .select("*")
        .eq("truck_id", truckId!)
        .order("service_date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as MaintenanceRecord[];
    },
  });
}

export function useCreateMaintenance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: MaintenanceInsert) => {
      const { data, error } = await db.from("maintenance_records").insert(input).select().single();
      if (error) throw new Error(error.message);
      return data as MaintenanceRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      toast({ title: tNow("maintenance.toastSaved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDeleteMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("maintenance_records").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["maintenance"] }),
  });
}
