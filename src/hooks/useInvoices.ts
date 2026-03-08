import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string;
  amount: number;
  status: string;
  due_date: string;
  paid_date: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceInsert {
  client_id: string;
  amount: number;
  status?: string;
  due_date: string;
  paid_date?: string | null;
  description?: string | null;
}

export function useInvoices(clientId?: string) {
  return useQuery({
    queryKey: ["invoices", clientId],
    queryFn: async () => {
      let query = supabase.from("invoices").select("*, clients(company_name)").order("due_date", { ascending: false });
      if (clientId) query = query.eq("client_id", clientId);
      const { data, error } = await query;
      if (error) throw error;
      return data as (Invoice & { clients: { company_name: string } })[];
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (invoice: InvoiceInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("invoices")
        .insert({ ...invoice, user_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Fatura criada com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar fatura", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InvoiceInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("invoices")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Fatura atualizada!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Fatura removida!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    },
  });
}
