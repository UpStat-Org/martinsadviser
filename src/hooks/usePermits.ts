import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

export type Permit = Tables<"permits">;
export type PermitInsert = TablesInsert<"permits">;
export type PermitUpdate = TablesUpdate<"permits">;

export const PERMIT_TYPES = [
  "IRP",
  "IFTA",
  "UCR",
  "Apportioned",
  "Renew Commercial",
  "Oversize",
  "Overweight",
  "Trip Permit",
  "Fuel Permit",
  "Other",
] as const;

export function usePermits(search?: string, clientId?: string, statusFilter?: string) {
  return useQuery({
    queryKey: ["permits", search, clientId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("permits")
        .select("*, clients(company_name), trucks(plate)")
        .order("expiration_date", { ascending: true });
      if (clientId) query = query.eq("client_id", clientId);
      if (search) {
        query = query.or(`permit_type.ilike.%${search}%,permit_number.ilike.%${search}%,state.ilike.%${search}%`);
      }
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePermit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (permit: Omit<PermitInsert, "user_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("permits")
        .insert({ ...permit, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permits"] });
      toast({ title: "Permit cadastrado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao cadastrar permit", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdatePermit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PermitUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("permits")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permits"] });
      toast({ title: "Permit atualizado!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeletePermit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("permits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permits"] });
      toast({ title: "Permit removido!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    },
  });
}

export function getExpirationStatus(expirationDate: string | null) {
  if (!expirationDate) return { label: "Sem data", color: "bg-muted text-muted-foreground" };
  const now = new Date();
  const exp = new Date(expirationDate);
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: "Vencido", color: "bg-destructive text-destructive-foreground" };
  if (diffDays <= 30) return { label: `${diffDays}d restantes`, color: "bg-destructive text-destructive-foreground" };
  if (diffDays <= 60) return { label: `${diffDays}d restantes`, color: "bg-warning text-warning-foreground" };
  if (diffDays <= 90) return { label: `${diffDays}d restantes`, color: "bg-warning text-warning-foreground" };
  return { label: "Válido", color: "bg-success text-success-foreground" };
}
