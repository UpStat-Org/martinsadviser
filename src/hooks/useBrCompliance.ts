import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { tNow } from "@/lib/translations";
import type { BrComplianceKind, BrScope, FineSeverity } from "@/lib/brCompliance";

// br_compliance_items / br_fines vêm de 20260824160000_br_compliance.sql e
// ainda não estão no `Database` gerado. Mesmo builder solto de useDrivers.
const db = supabase as unknown as {
  from: (table: string) => {
    select: (cols?: string) => any;
    insert: (row: unknown) => any;
    update: (patch: unknown) => any;
    delete: () => any;
  };
};

export interface BrComplianceItem {
  id: string;
  org_id: string;
  user_id: string;
  scope: BrScope;
  driver_id: string | null;
  truck_id: string | null;
  client_id: string | null;
  kind: BrComplianceKind;
  document_number: string | null;
  issued_on: string | null;
  expires_on: string | null;
  document_url: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  drivers?: { full_name: string } | null;
  trucks?: { plate: string } | null;
  clients?: { company_name: string } | null;
}

export interface BrFine {
  id: string;
  org_id: string;
  user_id: string;
  client_id: string | null;
  driver_id: string | null;
  truck_id: string | null;
  notice_number: string | null;
  authority: string | null;
  infraction_code: string | null;
  description: string | null;
  severity: FineSeverity;
  points: number;
  amount: number;
  occurred_at: string | null;
  notified_on: string | null;
  defense_due_on: string | null;
  payment_due_on: string | null;
  status: "pending" | "appealed" | "paid" | "cancelled";
  document_url: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  drivers?: { full_name: string } | null;
  trucks?: { plate: string } | null;
  clients?: { company_name: string } | null;
}

const ITEM_SELECT = "*, drivers(full_name), trucks(plate), clients(company_name)";
const FINE_SELECT = "*, drivers(full_name), trucks(plate), clients(company_name)";

export type BrComplianceFilter = {
  scope?: BrScope;
  driverId?: string;
  truckId?: string;
  clientId?: string;
};

export function useBrComplianceItems(filter: BrComplianceFilter = {}) {
  const { scope, driverId, truckId, clientId } = filter;
  return useQuery({
    queryKey: ["br_compliance", scope ?? "all", driverId ?? "-", truckId ?? "-", clientId ?? "-"],
    queryFn: async () => {
      let q = db.from("br_compliance_items").select(ITEM_SELECT);
      if (scope) q = q.eq("scope", scope);
      if (driverId) q = q.eq("driver_id", driverId);
      if (truckId) q = q.eq("truck_id", truckId);
      if (clientId) q = q.eq("client_id", clientId);
      // O que vence primeiro no topo. Sem validade vai pro fim: é cadastro
      // incompleto, não urgência.
      const { data, error } = await q.order("expires_on", { ascending: true, nullsFirst: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as BrComplianceItem[];
    },
  });
}

export type BrComplianceInsert = {
  scope: BrScope;
  kind: BrComplianceKind;
  driver_id?: string | null;
  truck_id?: string | null;
  client_id?: string | null;
  document_number?: string | null;
  issued_on?: string | null;
  expires_on?: string | null;
  document_url?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
};

export function useUpsertBrComplianceItem() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...input }: BrComplianceInsert & { id?: string }) => {
      if (id) {
        const { data, error } = await db
          .from("br_compliance_items").update(input).eq("id", id).select().single();
        if (error) throw new Error(error.message);
        return data as BrComplianceItem;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(tNow("toast.authRequired"));
      const { data, error } = await db
        .from("br_compliance_items").insert({ ...input, user_id: user.id }).select().single();
      if (error) throw new Error(error.message);
      return data as BrComplianceItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["br_compliance"] });
      toast({ title: tNow("br.item.saved") });
    },
    onError: (e: Error) =>
      toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDeleteBrComplianceItem() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("br_compliance_items").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["br_compliance"] });
      toast({ title: tNow("br.item.removed") });
    },
    onError: (e: Error) =>
      toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

// ── Multas ─────────────────────────────────────────────────────────────────

export function useBrFines(filter: { driverId?: string; truckId?: string; clientId?: string } = {}) {
  const { driverId, truckId, clientId } = filter;
  return useQuery({
    queryKey: ["br_fines", driverId ?? "-", truckId ?? "-", clientId ?? "-"],
    queryFn: async () => {
      let q = db.from("br_fines").select(FINE_SELECT);
      if (driverId) q = q.eq("driver_id", driverId);
      if (truckId) q = q.eq("truck_id", truckId);
      if (clientId) q = q.eq("client_id", clientId);
      // Prazo de defesa mais curto primeiro — é o relógio que corre.
      const { data, error } = await q.order("defense_due_on", { ascending: true, nullsFirst: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as BrFine[];
    },
  });
}

export type BrFineInsert = {
  client_id?: string | null;
  driver_id?: string | null;
  truck_id?: string | null;
  notice_number?: string | null;
  authority?: string | null;
  infraction_code?: string | null;
  description?: string | null;
  severity?: FineSeverity;
  points?: number;
  amount?: number;
  occurred_at?: string | null;
  notified_on?: string | null;
  defense_due_on?: string | null;
  payment_due_on?: string | null;
  status?: BrFine["status"];
  notes?: string | null;
};

export function useUpsertBrFine() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, silent, ...input }: BrFineInsert & { id?: string; silent?: boolean }) => {
      if (id) {
        const { data, error } = await db.from("br_fines").update(input).eq("id", id).select().single();
        if (error) throw new Error(error.message);
        return data as BrFine;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(tNow("toast.authRequired"));
      const { data, error } = await db
        .from("br_fines").insert({ ...input, user_id: user.id }).select().single();
      if (error) throw new Error(error.message);
      return data as BrFine;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["br_fines"] });
      if (!vars.silent) toast({ title: tNow("br.fine.saved") });
    },
    onError: (e: Error) =>
      toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDeleteBrFine() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("br_fines").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["br_fines"] });
      toast({ title: tNow("br.fine.removed") });
    },
    onError: (e: Error) =>
      toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}
