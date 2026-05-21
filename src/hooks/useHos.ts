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

export type HosRule =
  | "driving_11h"
  | "on_duty_14h"
  | "break_30min"
  | "weekly_60h"
  | "weekly_70h"
  | "logbook_error"
  | "other";

export type HosSeverity = "minor" | "serious" | "critical";

export type HosSource = "manual" | "eld_motive" | "eld_samsara" | "eld_keep_truckin" | "fmcsa_inspection";

export interface HosViolation {
  id: string;
  org_id: string;
  driver_id: string;
  user_id: string;
  occurred_at: string;
  rule_violated: HosRule;
  severity: HosSeverity;
  source: HosSource;
  resolved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type HosViolationInsert = Omit<HosViolation, "id" | "org_id" | "created_at" | "updated_at">;

export const HOS_RULES: Array<{ key: HosRule; labelKey: string }> = [
  { key: "driving_11h", labelKey: "hos.rule.driving11h" },
  { key: "on_duty_14h", labelKey: "hos.rule.onDuty14h" },
  { key: "break_30min", labelKey: "hos.rule.break30min" },
  { key: "weekly_60h", labelKey: "hos.rule.weekly60h" },
  { key: "weekly_70h", labelKey: "hos.rule.weekly70h" },
  { key: "logbook_error", labelKey: "hos.rule.logbookError" },
  { key: "other", labelKey: "hos.rule.other" },
];

export function useHosViolations(driverId?: string) {
  return useQuery({
    queryKey: ["hos_violations", driverId ?? "all"],
    queryFn: async () => {
      let q = db.from("hos_violations").select("*");
      if (driverId) q = q.eq("driver_id", driverId);
      const { data, error } = await q.order("occurred_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as HosViolation[];
    },
  });
}

export function useCreateHosViolation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: HosViolationInsert) => {
      const { data, error } = await db.from("hos_violations").insert(input).select().single();
      if (error) throw new Error(error.message);
      return data as HosViolation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hos_violations"] });
      toast({ title: tNow("hos.toastSaved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useUpdateHosViolation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<HosViolation> }) => {
      const { data, error } = await db.from("hos_violations").update(patch).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as HosViolation;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hos_violations"] }),
  });
}

export function useDeleteHosViolation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("hos_violations").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hos_violations"] }),
  });
}
