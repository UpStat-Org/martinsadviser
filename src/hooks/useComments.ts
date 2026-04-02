import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Comment {
  id: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  user_name: string;
  body: string;
  created_at: string;
}

export function useComments(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: ["comments", entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Comment[];
    },
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (comment: { entity_type: string; entity_id: string; body: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();
      const userName = profile?.full_name || profile?.email || user.email || "Usuário";
      const { data, error } = await supabase
        .from("comments")
        .insert({ ...comment, user_id: user.id, user_name: userName })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["comments", vars.entity_type, vars.entity_id] });
      toast({ title: "Comentário adicionado!" });
    },
    onError: (e) => {
      toast({ title: "Erro ao comentar", description: e.message, variant: "destructive" });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { id: string; entity_type: string; entity_id: string }) => {
      const { error } = await supabase.from("comments").delete().eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["comments", vars.entity_type, vars.entity_id] });
      toast({ title: "Comentário removido!" });
    },
    onError: (e) => {
      toast({ title: "Erro ao remover", description: e.message, variant: "destructive" });
    },
  });
}
