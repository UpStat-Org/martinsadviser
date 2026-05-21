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

export type PolicyType =
  | "liability"
  | "cargo"
  | "physical_damage"
  | "general_liability"
  | "workers_comp"
  | "umbrella"
  | "other";

export interface InsuranceCertificate {
  id: string;
  org_id: string;
  client_id: string;
  user_id: string;
  policy_type: PolicyType;
  policy_number: string | null;
  insurer_name: string | null;
  coverage_amount: number | null;
  effective_date: string | null;
  expiration_date: string | null;
  document_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type InsuranceInsert = Omit<InsuranceCertificate, "id" | "org_id" | "created_at" | "updated_at">;

export const POLICY_TYPES: PolicyType[] = [
  "liability",
  "cargo",
  "physical_damage",
  "general_liability",
  "workers_comp",
  "umbrella",
  "other",
];

export function useInsuranceCertificates(clientId: string | undefined) {
  return useQuery({
    queryKey: ["insurance", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await db
        .from("insurance_certificates")
        .select("*")
        .eq("client_id", clientId!)
        .order("expiration_date", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as InsuranceCertificate[];
    },
  });
}

export function useCreateInsurance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: InsuranceInsert) => {
      const { data, error } = await db.from("insurance_certificates").insert(input).select().single();
      if (error) throw new Error(error.message);
      return data as InsuranceCertificate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance"] });
      toast({ title: tNow("insurance.toastSaved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDeleteInsurance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("insurance_certificates").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["insurance"] }),
  });
}
