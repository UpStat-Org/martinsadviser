import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Types based on DB schema
export interface MessageTemplate {
  id: string;
  user_id: string;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduledMessage {
  id: string;
  user_id: string;
  client_id: string;
  template_id: string | null;
  channel: string;
  subject: string | null;
  body: string;
  scheduled_at: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  clients?: { company_name: string; dot?: string | null; mc?: string | null; ein?: string | null; email?: string | null; phone?: string | null } | null;
}

// ---- Templates ----

export function useMessageTemplates() {
  return useQuery({
    queryKey: ["message_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MessageTemplate[];
    },
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (t: Omit<MessageTemplate, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("message_templates")
        .insert({ ...t, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["message_templates"] }); toast({ title: "Template criado!" }); },
    onError: (e) => { toast({ title: "Erro ao criar template", description: e.message, variant: "destructive" }); },
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MessageTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("message_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["message_templates"] }); toast({ title: "Template atualizado!" }); },
    onError: (e) => { toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }); },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("message_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["message_templates"] }); toast({ title: "Template removido!" }); },
    onError: (e) => { toast({ title: "Erro ao remover", description: e.message, variant: "destructive" }); },
  });
}

// ---- Scheduled Messages ----

export function useScheduledMessages(status?: string) {
  return useQuery({
    queryKey: ["scheduled_messages", status],
    queryFn: async () => {
      let query = supabase
        .from("scheduled_messages")
        .select("*, clients(company_name)")
        .order("scheduled_at", { ascending: true });
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data as ScheduledMessage[];
    },
  });
}

export function useCreateScheduledMessage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (m: { client_id: string; template_id?: string | null; channel: string; subject?: string | null; body: string; scheduled_at: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("scheduled_messages")
        .insert({ ...m, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scheduled_messages"] }); toast({ title: "Mensagem agendada!" }); },
    onError: (e) => { toast({ title: "Erro ao agendar", description: e.message, variant: "destructive" }); },
  });
}

export function useCancelScheduledMessage() {
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scheduled_messages"] }); toast({ title: "Mensagem cancelada!" }); },
    onError: (e) => { toast({ title: "Erro ao cancelar", description: e.message, variant: "destructive" }); },
  });
}
