import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { tNow } from "@/lib/translations";

const db = supabase as unknown as {
  from: (table: string) => {
    select: (cols?: string) => any;
    insert: (row: unknown) => any;
    update: (patch: unknown) => any;
    delete: () => any;
  };
};

export type SavedViewScope = "clients" | "permits" | "trucks" | "tasks" | "invoices";

export interface SavedView {
  id: string;
  org_id: string;
  user_id: string;
  scope: SavedViewScope;
  name: string;
  filters: Record<string, unknown>;
  shared: boolean;
  created_at: string;
  updated_at: string;
}

export type SavedViewInsert = Omit<SavedView, "id" | "org_id" | "created_at" | "updated_at">;

export function useSavedViews(scope: SavedViewScope) {
  return useQuery({
    queryKey: ["saved_views", scope],
    queryFn: async () => {
      const { data, error } = await db
        .from("saved_views")
        .select("*")
        .eq("scope", scope)
        .order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as SavedView[];
    },
  });
}

export function useCreateSavedView() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: SavedViewInsert) => {
      const { data, error } = await db.from("saved_views").insert(input).select().single();
      if (error) throw new Error(error.message);
      return data as SavedView;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved_views"] });
      toast({ title: tNow("savedViews.toastSaved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDeleteSavedView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("saved_views").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved_views"] }),
  });
}
