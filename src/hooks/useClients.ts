import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { tNow } from "@/lib/translations";
import { sanitizeSearchTerm } from "@/lib/utils";

export type Client = Tables<"clients">;
export type ClientInsert = TablesInsert<"clients">;
export type ClientUpdate = TablesUpdate<"clients">;

export function useClients(search?: string) {
  return useQuery({
    queryKey: ["clients", search],
    queryFn: async () => {
      let query = supabase.from("clients").select("*").order("company_name");
      if (search) {
        const safe = sanitizeSearchTerm(search);
        if (safe) {
          query = query.or(
            `company_name.ilike.%${safe}%,dot.ilike.%${safe}%,mc.ilike.%${safe}%,ein.ilike.%${safe}%`
          );
        }
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ["clients", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCheckClientDuplicate() {
  return async (dot?: string | null, ein?: string | null, excludeId?: string) => {
    const duplicates: string[] = [];

    if (dot?.trim()) {
      let query = supabase.from("clients").select("id, company_name").eq("dot", dot.trim());
      if (excludeId) query = query.neq("id", excludeId);
      const { data } = await query;
      if (data?.length) {
        duplicates.push(`DOT "${dot}" ${tNow("clients.duplicateRegisteredIn")}: ${data[0].company_name}`);
      }
    }

    if (ein?.trim()) {
      let query = supabase.from("clients").select("id, company_name").eq("ein", ein.trim());
      if (excludeId) query = query.neq("id", excludeId);
      const { data } = await query;
      if (data?.length) {
        duplicates.push(`EIN "${ein}" ${tNow("clients.duplicateRegisteredIn")}: ${data[0].company_name}`);
      }
    }

    return duplicates;
  };
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (client: Omit<ClientInsert, "user_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(tNow("toast.authRequired"));
      const { data, error } = await supabase
        .from("clients")
        .insert({ ...client, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: tNow("toast.clientCreated") });
    },
    onError: (error) => {
      toast({ title: tNow("toast.clientCreateError"), description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ClientUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: tNow("toast.clientUpdated") });
    },
    onError: (error) => {
      toast({ title: tNow("toast.updateError"), description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: tNow("toast.clientRemoved") });
    },
    onError: (error) => {
      toast({ title: tNow("toast.removeError"), description: error.message, variant: "destructive" });
    },
  });
}
