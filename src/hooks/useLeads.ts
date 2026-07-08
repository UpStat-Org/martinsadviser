import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { tNow } from "@/lib/translations";

// leads isn't in the generated types yet — cast the client (see useInsurance).
const db = supabase as unknown as {
  from: (table: string) => {
    select: (cols?: string) => any;
    insert: (row: unknown) => any;
    update: (patch: unknown) => any;
    delete: () => any;
  };
};

export type LeadStage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

export const LEAD_STAGES: LeadStage[] = ["new", "contacted", "qualified", "proposal", "won", "lost"];

// Stages shown as pipeline columns (won/lost live in their own filtered views).
export const PIPELINE_STAGES: LeadStage[] = ["new", "contacted", "qualified", "proposal"];

export interface Lead {
  id: string;
  org_id: string;
  user_id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  dot: string | null;
  mc: string | null;
  stage: LeadStage;
  source: string | null;
  estimated_value: number | null;
  notes: string | null;
  assigned_to: string | null;
  converted_client_id: string | null;
  lost_reason: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export type LeadInsert = {
  company_name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  dot?: string | null;
  mc?: string | null;
  stage?: LeadStage;
  source?: string | null;
  estimated_value?: number | null;
  notes?: string | null;
};

export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await db
        .from("leads")
        .select("*")
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Lead[];
    },
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: LeadInsert) => {
      const { data, error } = await db.from("leads").insert(input).select().single();
      if (error) throw new Error(error.message);
      return data as Lead;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: tNow("leads.saved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, silent, ...patch }: Partial<LeadInsert> & { id: string; stage?: LeadStage; lost_reason?: string | null; position?: number; silent?: boolean }) => {
      const { data, error } = await db.from("leads").update(patch).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as Lead;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      if (!vars.silent) toast({ title: tNow("leads.saved") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("leads").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: tNow("leads.removed") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

// Promote a won lead into a real client. Creates the client (carrying over
// company/DOT/MC/contact), then marks the lead won + linked so it can't be
// converted twice. Returns the new client id for navigation.
export function useConvertLead() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (lead: Lead) => {
      if (lead.converted_client_id) return lead.converted_client_id;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(tNow("toast.authRequired"));
      const { data: client, error: cErr } = await db
        .from("clients")
        .insert({
          user_id: user.id,
          company_name: lead.company_name,
          dot: lead.dot || null,
          mc: lead.mc || null,
          email: lead.email || null,
          phone: lead.phone || null,
          registration_responsible: lead.contact_name || null,
          notes: lead.notes || null,
        })
        .select("id")
        .single();
      if (cErr) throw new Error(cErr.message);
      const { error: lErr } = await db
        .from("leads")
        .update({ stage: "won", converted_client_id: client.id })
        .eq("id", lead.id);
      if (lErr) throw new Error(lErr.message);
      return client.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: tNow("leads.converted") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}
