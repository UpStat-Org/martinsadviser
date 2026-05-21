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

export type AccidentSeverity = "minor" | "major" | "fatal";

export interface Accident {
  id: string;
  org_id: string;
  client_id: string;
  truck_id: string | null;
  driver_id: string | null;
  user_id: string;
  occurred_at: string;
  location: string | null;
  state: string | null;
  fatalities: number;
  injuries: number;
  tow_required: boolean;
  usdot_reportable: boolean;
  severity: AccidentSeverity;
  fmcsa_report_number: string | null;
  police_report_number: string | null;
  narrative: string | null;
  document_url: string | null;
  created_at: string;
  updated_at: string;
}

export type AccidentInsert = Omit<Accident, "id" | "org_id" | "usdot_reportable" | "created_at" | "updated_at">;

export function useAccidents(filters: { clientId?: string; truckId?: string; driverId?: string }) {
  return useQuery({
    queryKey: ["accidents", filters],
    enabled: !!(filters.clientId || filters.truckId || filters.driverId),
    queryFn: async () => {
      let q = db.from("accidents").select("*");
      if (filters.clientId) q = q.eq("client_id", filters.clientId);
      if (filters.truckId) q = q.eq("truck_id", filters.truckId);
      if (filters.driverId) q = q.eq("driver_id", filters.driverId);
      const { data, error } = await q.order("occurred_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Accident[];
    },
  });
}

export function useCreateAccident() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: AccidentInsert) => {
      const { data, error } = await db.from("accidents").insert(input).select().single();
      if (error) throw new Error(error.message);
      return data as Accident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accidents"] });
      toast({ title: tNow("accidents.toastSaved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDeleteAccident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("accidents").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accidents"] }),
  });
}
