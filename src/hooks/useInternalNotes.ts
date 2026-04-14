import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface InternalNote {
  id: string;
  client_id: string;
  user_id: string;
  user_name: string;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export function useInternalNotes(clientId: string | undefined) {
  return useQuery({
    queryKey: ["internal_notes", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("client_internal_notes")
        .select("*")
        .eq("client_id", clientId!)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as InternalNote[];
    },
  });
}

export function useCreateInternalNote() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { client_id: string; body: string; pinned?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();
      const user_name = profile?.full_name || profile?.email || user.email || "Usuário";
      const { error } = await (supabase as any).from("client_internal_notes").insert({
        client_id: input.client_id,
        body: input.body,
        pinned: input.pinned ?? false,
        user_id: user.id,
        user_name,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["internal_notes", vars.client_id] });
      toast({ title: "Nota interna salva" });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar nota", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateInternalNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; client_id: string; body?: string; pinned?: boolean }) => {
      const updates: any = { updated_at: new Date().toISOString() };
      if (input.body !== undefined) updates.body = input.body;
      if (input.pinned !== undefined) updates.pinned = input.pinned;
      const { error } = await (supabase as any).from("client_internal_notes").update(updates).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["internal_notes", vars.client_id] }),
  });
}

export function useDeleteInternalNote() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { id: string; client_id: string }) => {
      const { error } = await (supabase as any).from("client_internal_notes").delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["internal_notes", vars.client_id] });
      toast({ title: "Nota removida" });
    },
  });
}
