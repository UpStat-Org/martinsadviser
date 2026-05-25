import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { tNow } from "@/lib/translations";
import { sanitizeSearchTerm } from "@/lib/utils";

export type Permit = Tables<"permits">;
export type PermitInsert = TablesInsert<"permits">;
export type PermitUpdate = TablesUpdate<"permits">;

export type PermitWithRelations = Permit & {
  clients?: { company_name: string; country?: string } | null;
  trucks?: { plate: string } | null;
};

export const PERMIT_TYPES = [
  "IRP",
  "IFTA",
  "UCR",
  "Renew Apportioned",
  "Renew Commercial",
  "Oversize",
  "Overweight",
  "Trip Permit",
  "Fuel Permit",
  // Hazardous materials (49 CFR §172/§173)
  "Hazmat HM-126F",
  "Hazmat HM-181",
  "Hazmat HM-232",
  "Hazmat Generic",
  // Border crossing
  "CBP I-94",
  "CBP ACE Manifest",
  "FAST (US-Canada)",
  "FAST (US-Mexico)",
  "PARS / PAPS",
  "Other",
] as const;

/**
 * Categories that need extra metadata fields in the permit form (hazmat
 * class / UN number, CBP port code, etc.). Permits of other types just use
 * the standard fields and `metadata = {}`.
 */
export function permitCategory(permitType: string): "hazmat" | "border" | "generic" {
  if (permitType.startsWith("Hazmat ")) return "hazmat";
  if (
    permitType.startsWith("CBP ") ||
    permitType.startsWith("FAST ") ||
    permitType === "PARS / PAPS"
  ) return "border";
  return "generic";
}

export function usePermits(
  search?: string,
  clientId?: string,
  statusFilter?: string,
) {
  return useQuery({
    queryKey: ["permits", search, clientId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("permits")
        .select("*, clients(company_name, country), trucks(plate)")
        .order("expiration_date", { ascending: true });
      if (clientId) query = query.eq("client_id", clientId);
      if (search) {
        // See useTrucks for the rationale — punctuation in the raw query
        // would corrupt the PostgREST OR list.
        const safe = sanitizeSearchTerm(search);
        if (safe) {
          query = query.or(
            `permit_type.ilike.%${safe}%,permit_number.ilike.%${safe}%,state.ilike.%${safe}%`,
          );
        }
      }
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as PermitWithRelations[];
    },
  });
}

export function usePermit(id: string | undefined) {
  return useQuery({
    queryKey: ["permits", "detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permits")
        .select("*, clients(company_name, country), trucks(plate)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as PermitWithRelations;
    },
  });
}

export function useCreatePermit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (permit: Omit<PermitInsert, "user_id">) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(tNow("toast.authRequired"));
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
      toast({ title: tNow("toast.permitCreated") });
    },
    onError: (error) => {
      toast({
        title: tNow("toast.createError"),
        description: error.message,
        variant: "destructive",
      });
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
      toast({ title: tNow("toast.permitUpdated") });
    },
    onError: (error) => {
      toast({
        title: tNow("toast.updateError"),
        description: error.message,
        variant: "destructive",
      });
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
      toast({ title: tNow("toast.permitRemoved") });
    },
    onError: (error) => {
      toast({
        title: tNow("toast.removeError"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function getExpirationStatus(expirationDate: string | null) {
  if (!expirationDate)
    return { label: tNow("compliance.noDate"), color: "bg-muted text-muted-foreground" };
  const now = new Date();
  const exp = new Date(expirationDate);
  const diffDays = Math.ceil(
    (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0)
    return {
      label: tNow("common.expired"),
      color: "bg-destructive text-destructive-foreground",
    };
  if (diffDays <= 30)
    return {
      label: tNow("common.daysRemaining").replace("{days}", String(diffDays)),
      color: "bg-destructive text-destructive-foreground",
    };
  if (diffDays <= 60)
    return {
      label: tNow("common.daysRemaining").replace("{days}", String(diffDays)),
      color: "bg-warning text-warning-foreground",
    };
  if (diffDays <= 90)
    return {
      label: tNow("common.daysRemaining").replace("{days}", String(diffDays)),
      color: "bg-warning text-warning-foreground",
    };
  return { label: tNow("common.valid"), color: "bg-success text-success-foreground" };
}
