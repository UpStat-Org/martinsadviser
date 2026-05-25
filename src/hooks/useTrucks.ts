import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { tNow } from "@/lib/translations";
import { sanitizeSearchTerm } from "@/lib/utils";

export type Truck = Tables<"trucks">;
export type TruckInsert = TablesInsert<"trucks">;
export type TruckUpdate = TablesUpdate<"trucks">;
export type TruckWithClient = Truck & { clients?: { company_name: string } | null };

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
        // Sanitize before interpolation: a comma, paren, or dot in the user's
        // input would otherwise be parsed as PostgREST OR-list syntax and
        // either error out or — worse — silently match the wrong columns.
        const safe = sanitizeSearchTerm(search);
        if (safe) {
          query = query.or(
            `plate.ilike.%${safe}%,vin.ilike.%${safe}%,make.ilike.%${safe}%,model.ilike.%${safe}%`,
          );
        }
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as TruckWithClient[];
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
      return data as TruckWithClient;
    },
  });
}

export function useCreateTruck() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (truck: Omit<TruckInsert, "user_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(tNow("toast.authRequired"));
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
      toast({ title: tNow("toast.truckCreated") });
    },
    onError: (error) => {
      toast({ title: tNow("toast.truckCreateError"), description: error.message, variant: "destructive" });
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
      toast({ title: tNow("toast.truckUpdated") });
    },
    onError: (error) => {
      toast({ title: tNow("toast.updateError"), description: error.message, variant: "destructive" });
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
      toast({ title: tNow("toast.truckRemoved") });
    },
    onError: (error) => {
      toast({ title: tNow("toast.removeError"), description: error.message, variant: "destructive" });
    },
  });
}
