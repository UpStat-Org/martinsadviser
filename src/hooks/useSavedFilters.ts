import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

export interface SavedFilter {
  id: string;
  user_id: string;
  name: string;
  page: string;
  filters: Json;
  created_at: string;
}

export function useSavedFilters(page: string) {
  return useQuery({
    queryKey: ["saved_filters", page],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_filters")
        .select("*")
        .eq("page", page)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SavedFilter[];
    },
  });
}

export function useCreateSavedFilter() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (filter: { name: string; page: string; filters: Record<string, any> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("saved_filters")
        .insert({ ...filter, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["saved_filters", vars.page] });
      toast({ title: "Filtro salvo!" });
    },
    onError: (e) => {
      toast({ title: "Erro ao salvar filtro", description: e.message, variant: "destructive" });
    },
  });
}

export function useDeleteSavedFilter() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { id: string; page: string }) => {
      const { error } = await supabase.from("saved_filters").delete().eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["saved_filters", vars.page] });
      toast({ title: "Filtro removido!" });
    },
    onError: (e) => {
      toast({ title: "Erro ao remover", description: e.message, variant: "destructive" });
    },
  });
}
