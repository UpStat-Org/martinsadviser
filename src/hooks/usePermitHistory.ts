import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

export interface PermitHistoryEntry {
  id: string;
  permit_id: string;
  changed_by: string;
  change_type: string;
  old_values: Json | null;
  new_values: Json | null;
  notes: string | null;
  created_at: string;
}

export function usePermitHistory(permitId: string | undefined) {
  return useQuery({
    queryKey: ["permit_history", permitId],
    enabled: !!permitId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permit_history")
        .select("*")
        .eq("permit_id", permitId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PermitHistoryEntry[];
    },
  });
}

export function useCreatePermitHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: {
      permit_id: string;
      change_type: string;
      old_values?: Record<string, any> | null;
      new_values?: Record<string, any> | null;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("permit_history")
        .insert({ ...entry, changed_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["permit_history", vars.permit_id] });
    },
  });
}
