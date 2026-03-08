import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

export type Truck = Tables<"trucks">;
export type TruckInsert = TablesInsert<"trucks">;
export type TruckUpdate = TablesUpdate<"trucks">;

export function useTrucks(search?: string, clientId?: string) {
  return useQuery({
    queryKey: ["trucks", search, clientId],
    queryFn: async () => {
      let query = supabase
        .from("trucks")
        .select("*, clients(company_name)")
        .order("created_at", { ascending: false });
      if (clientId) query = query.eq("client_id", clientId);
      if (search) {
        query = query.or(`plate.ilike.%${search}%,vin.ilike.%${search}%,make.ilike.%${search}%,model.ilike.%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useTruck(id: string | undefined) {
  return useQuery({
    queryKey: ["trucks", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trucks")
        .select("*, clients(company_name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTruck() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (truck: Omit<TruckInsert, "user_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("trucks")
        .insert({ ...truck, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trucks"] });
      toast({ title: "Caminhão cadastrado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao cadastrar caminhão", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateTruck() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TruckUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("trucks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trucks"] });
      toast({ title: "Caminhão atualizado!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteTruck() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trucks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trucks"] });
      toast({ title: "Caminhão removido!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    },
  });
}
