import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AutomationRule {
  id: string;
  user_id: string;
  name: string;
  days_before: number;
  channel: string;
  template_id: string | null;
  subject: string | null;
  body: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useAutomationRules() {
  return useQuery({
    queryKey: ["automation_rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .order("days_before", { ascending: true });
      if (error) throw error;
      return data as AutomationRule[];
    },
  });
}

export function useCreateAutomationRule() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (rule: Omit<AutomationRule, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("automation_rules")
        .insert({ ...rule, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automation_rules"] }); toast({ title: "Automação criada!" }); },
    onError: (e) => { toast({ title: "Erro ao criar automação", description: e.message, variant: "destructive" }); },
  });
}

export function useUpdateAutomationRule() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AutomationRule> & { id: string }) => {
      const { data, error } = await supabase
        .from("automation_rules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automation_rules"] }); toast({ title: "Automação atualizada!" }); },
    onError: (e) => { toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }); },
  });
}

export function useDeleteAutomationRule() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automation_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automation_rules"] }); toast({ title: "Automação removida!" }); },
    onError: (e) => { toast({ title: "Erro ao remover", description: e.message, variant: "destructive" }); },
  });
}
