import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { tNow } from "@/lib/translations";
import { useOrg } from "@/contexts/OrgContext";

export interface ComplianceAutomationSettings {
  org_id: string;
  enabled: boolean;
  lead_days: number;
  ifta_enabled: boolean;
  kyu_enabled: boolean;
  nm_enabled: boolean;
  hvut_enabled: boolean;
  ucr_enabled: boolean;
  mcs150_enabled: boolean;
  notify: boolean;
  created_at: string;
  updated_at: string;
}

export const COMPLIANCE_AUTOMATION_DEFAULTS: Omit<
  ComplianceAutomationSettings,
  "org_id" | "created_at" | "updated_at"
> = {
  enabled: true,
  lead_days: 30,
  ifta_enabled: true,
  kyu_enabled: true,
  nm_enabled: true,
  hvut_enabled: true,
  ucr_enabled: true,
  mcs150_enabled: true,
  notify: true,
};

// One row per org (RLS scopes to the caller's org), so maybeSingle is correct.
export function useComplianceAutomationSettings() {
  return useQuery({
    queryKey: ["compliance_automation_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_automation_settings")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data as ComplianceAutomationSettings | null;
    },
  });
}

type ComplianceAutomationInput = Omit<
  ComplianceAutomationSettings,
  "org_id" | "created_at" | "updated_at"
>;

export function useUpdateComplianceAutomation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { currentOrg } = useOrg();
  return useMutation({
    // Caller sends the FULL settings object so upsert never clobbers an
    // untouched field back to its default.
    mutationFn: async (settings: ComplianceAutomationInput) => {
      if (!currentOrg) throw new Error(tNow("toast.error"));
      const { error } = await supabase
        .from("compliance_automation_settings")
        .upsert({ org_id: currentOrg.id, ...settings }, { onConflict: "org_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance_automation_settings"] });
      toast({ title: tNow("toast.automationUpdated") });
    },
    onError: (e: any) => {
      toast({ title: tNow("toast.updateError"), description: e.message, variant: "destructive" });
    },
  });
}
