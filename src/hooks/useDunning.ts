import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { tNow } from "@/lib/translations";
import { useOrg } from "@/contexts/OrgContext";

// ── Dunning approval queue ────────────────────────────────────────────────
// The engine drafts collection reminders into scheduled_messages with
// status='pending_review'. claim_pending_messages only picks status='pending',
// so drafts sit here until a human approves (→ pending) or rejects (→ cancelled).

export interface DunningDraft {
  id: string;
  client_id: string;
  channel: string;
  subject: string | null;
  body: string;
  scheduled_at: string;
  created_at: string;
  clients: { company_name: string } | null;
}

export function useDunningQueue() {
  return useQuery({
    queryKey: ["dunning_queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_messages")
        .select("id, client_id, channel, subject, body, scheduled_at, created_at, clients(company_name)")
        .eq("status", "pending_review")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as DunningDraft[];
    },
  });
}

export function useApproveDunning() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    // Approving releases the draft into the send queue: status → pending and
    // scheduled_at = now so the next send-emails tick claims it.
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduled_messages")
        .update({ status: "pending", scheduled_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dunning_queue"] });
      toast({ title: tNow("dunning.approved") });
    },
    onError: (e: any) => toast({ title: tNow("toast.error"), description: e.message, variant: "destructive" }),
  });
}

export function useRejectDunning() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduled_messages")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dunning_queue"] });
      toast({ title: tNow("dunning.rejected") });
    },
    onError: (e: any) => toast({ title: tNow("toast.error"), description: e.message, variant: "destructive" }),
  });
}

// ── Dunning settings ──────────────────────────────────────────────────────

export interface DunningSettings {
  org_id: string;
  enabled: boolean;
  auto_send: boolean;
  stage_days: number[];
  channels: string[];
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export const DUNNING_DEFAULTS: Omit<DunningSettings, "org_id" | "created_at" | "updated_at"> = {
  enabled: true,
  auto_send: false,
  stage_days: [1, 7, 15, 30],
  channels: ["email", "whatsapp"],
  subject: "Fatura em atraso",
  body: "Olá {company_name},\n\nConsta em aberto a fatura de {amount}, vencida em {due_date} (há {days_overdue} dia(s)).\n\nPor favor, regularize o pagamento ou entre em contato.",
};

export function useDunningSettings() {
  return useQuery({
    queryKey: ["dunning_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dunning_settings").select("*").maybeSingle();
      if (error) throw error;
      return data as DunningSettings | null;
    },
  });
}

type DunningInput = Omit<DunningSettings, "org_id" | "created_at" | "updated_at">;

export function useUpdateDunningSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { currentOrg } = useOrg();
  return useMutation({
    mutationFn: async (settings: DunningInput) => {
      if (!currentOrg) throw new Error(tNow("toast.error"));
      const { error } = await supabase
        .from("dunning_settings")
        .upsert({ org_id: currentOrg.id, ...settings }, { onConflict: "org_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dunning_settings"] });
      toast({ title: tNow("toast.automationUpdated") });
    },
    onError: (e: any) => toast({ title: tNow("toast.updateError"), description: e.message, variant: "destructive" }),
  });
}
