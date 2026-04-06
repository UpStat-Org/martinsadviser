import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PermitDocument {
  id: string;
  permit_id: string;
  user_id: string | null;
  document_url: string;
  file_name: string | null;
  version: number;
  notes: string | null;
  is_current: boolean;
  created_at: string;
}

export function usePermitDocuments(permitId?: string) {
  return useQuery({
    queryKey: ["permit_documents", permitId],
    enabled: !!permitId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permit_documents")
        .select("*")
        .eq("permit_id", permitId!)
        .order("version", { ascending: false });
      if (error) throw error;
      return data as PermitDocument[];
    },
  });
}

export function useAddPermitDocument() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      permitId,
      documentUrl,
      fileName,
      notes,
    }: {
      permitId: string;
      documentUrl: string;
      fileName?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Get current max version
      const { data: existing } = await supabase
        .from("permit_documents")
        .select("version")
        .eq("permit_id", permitId)
        .order("version", { ascending: false })
        .limit(1);

      const nextVersion = existing?.length ? existing[0].version + 1 : 1;

      // Mark all previous versions as not current
      await supabase
        .from("permit_documents")
        .update({ is_current: false })
        .eq("permit_id", permitId);

      // Insert new version
      const { data, error } = await supabase
        .from("permit_documents")
        .insert({
          permit_id: permitId,
          user_id: user?.id || null,
          document_url: documentUrl,
          file_name: fileName || null,
          version: nextVersion,
          notes: notes || null,
          is_current: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Also update the permit's document_url to the latest
      await supabase
        .from("permits")
        .update({ document_url: documentUrl })
        .eq("id", permitId);

      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["permit_documents", vars.permitId] });
      qc.invalidateQueries({ queryKey: ["permits"] });
      toast({ title: "Documento adicionado!" });
    },
    onError: (e) => {
      toast({ title: "Erro ao adicionar documento", description: e.message, variant: "destructive" });
    },
  });
}

export function useDeletePermitDocument() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, permitId }: { id: string; permitId: string }) => {
      const { error } = await supabase
        .from("permit_documents")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return permitId;
    },
    onSuccess: (permitId) => {
      qc.invalidateQueries({ queryKey: ["permit_documents", permitId] });
      toast({ title: "Versão removida!" });
    },
    onError: (e) => {
      toast({ title: "Erro ao remover", description: e.message, variant: "destructive" });
    },
  });
}
