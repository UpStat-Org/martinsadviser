import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { tNow } from "@/lib/translations";
// DQF kind metadata lives in the pure lib (single source of truth, unit-tested).
// Re-exported here so existing callers keep importing from the hook.
import { DQF_KINDS, type DqfKind } from "@/lib/dqf";
export { DQF_KINDS, type DqfKind };

// Same Lovable-types caveat as useDrivers — see comment there.
const db = supabase as unknown as {
  from: (table: string) => {
    select: (cols?: string) => any;
    insert: (row: unknown) => any;
    update: (patch: unknown) => any;
    delete: () => any;
  };
};

export interface DriverDocument {
  id: string;
  org_id: string;
  driver_id: string;
  user_id: string;
  kind: DqfKind;
  document_url: string | null;
  issued_on: string | null;
  expires_on: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DriverDocumentInsert = Omit<DriverDocument, "id" | "org_id" | "created_at" | "updated_at">;

export function useDriverDocuments(driverId: string | undefined) {
  return useQuery({
    queryKey: ["driver_documents", driverId],
    enabled: !!driverId,
    queryFn: async () => {
      const { data, error } = await db
        .from("driver_documents")
        .select("*")
        .eq("driver_id", driverId!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as DriverDocument[];
    },
  });
}

// Org-wide fetch of every driver document in one round-trip (RLS scopes it to
// the caller's org). The Drivers hub uses this to compute DQF readiness for the
// whole roster without firing one query per driver. Returns a Map keyed by
// driver_id with each driver's docs newest-first (matching summarizeDqf's
// expectation).
export function useAllDriverDocuments() {
  return useQuery({
    queryKey: ["driver_documents", "all"],
    queryFn: async () => {
      const { data, error } = await db
        .from("driver_documents")
        .select("id, driver_id, kind, expires_on, created_at")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      const byDriver = new Map<string, DriverDocument[]>();
      for (const d of (data ?? []) as DriverDocument[]) {
        const arr = byDriver.get(d.driver_id) ?? [];
        arr.push(d);
        byDriver.set(d.driver_id, arr);
      }
      return byDriver;
    },
  });
}

export function useCreateDriverDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: DriverDocumentInsert) => {
      const { data, error } = await db
        .from("driver_documents")
        .insert(input)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as DriverDocument;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["driver_documents", vars.driver_id] });
      toast({ title: tNow("dqf.docAdded") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDeleteDriverDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("driver_documents").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver_documents"] });
    },
  });
}

// ---------------- Drug test events ----------------

export type DrugTestType =
  | "pre_employment"
  | "random"
  | "post_accident"
  | "reasonable_suspicion"
  | "return_to_duty"
  | "follow_up";

export interface DrugTestEvent {
  id: string;
  org_id: string;
  driver_id: string;
  user_id: string;
  test_type: DrugTestType;
  substance: "drug" | "alcohol";
  selection_for_quarter: string | null;
  scheduled_for: string | null;
  collected_at: string | null;
  result: "pending" | "negative" | "positive" | "refused" | "cancelled" | null;
  mro_reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DrugTestEventInsert = Omit<DrugTestEvent, "id" | "org_id" | "created_at" | "updated_at">;

export function useDrugTests(driverId?: string) {
  return useQuery({
    queryKey: ["drug_tests", driverId ?? "all"],
    queryFn: async () => {
      let q = db.from("drug_test_events").select("*");
      if (driverId) q = q.eq("driver_id", driverId);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as DrugTestEvent[];
    },
  });
}

export function useCreateDrugTest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: DrugTestEventInsert | DrugTestEventInsert[]) => {
      const { data, error } = await db.from("drug_test_events").insert(input).select();
      if (error) throw new Error(error.message);
      return data as DrugTestEvent[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drug_tests"] });
      toast({ title: tNow("drugTest.toastCreated") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export type DrugTestEventUpdate = Partial<
  Omit<DrugTestEvent, "id" | "org_id" | "user_id" | "driver_id" | "created_at" | "updated_at">
>;

export function useUpdateDrugTest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: DrugTestEventUpdate }) => {
      const { data, error } = await db
        .from("drug_test_events")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as DrugTestEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drug_tests"] });
      toast({ title: tNow("drugTest.toastUpdated") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}
