import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";
import { tNow } from "@/lib/translations";

// eld_connections / eld_sync_log aren't in the generated types yet.
const db = supabase as unknown as {
  from: (table: string) => {
    select: (cols?: string) => any;
    insert: (row: unknown) => any;
    update: (patch: unknown) => any;
    upsert: (row: unknown, opts?: unknown) => any;
  };
};

export type EldProvider = "motive" | "samsara";
export type EldStatus = "connected" | "disconnected" | "error";

export interface EldConnection {
  id: string;
  org_id: string;
  provider: EldProvider;
  status: EldStatus;
  last_sync_at: string | null;
  last_error: string | null;
  updated_at: string;
}

export interface EldSyncLogRow {
  id: string;
  provider: string;
  started_at: string;
  finished_at: string | null;
  hos_imported: number;
  status: string;
  message: string | null;
}

// Never selects api_key — credentials are write-only from the client.
export function useEldConnections() {
  return useQuery({
    queryKey: ["eld_connections"],
    queryFn: async () => {
      const { data, error } = await db
        .from("eld_connections")
        .select("id, org_id, provider, status, last_sync_at, last_error, updated_at");
      if (error) throw new Error(error.message);
      return (data ?? []) as EldConnection[];
    },
  });
}

export function useEldSyncLog(limit = 5) {
  return useQuery({
    queryKey: ["eld_sync_log", limit],
    queryFn: async () => {
      const { data, error } = await db
        .from("eld_sync_log")
        .select("id, provider, started_at, finished_at, hos_imported, status, message")
        .order("started_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as EldSyncLogRow[];
    },
  });
}

export function useConnectEld() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ provider, apiKey }: { provider: EldProvider; apiKey: string }) => {
      // The credential is encrypted server-side (eld-connect edge function); the
      // browser never writes the raw api_key to the table.
      const { data, error } = await supabase.functions.invoke("eld-connect", {
        body: { org_id: currentOrg?.id, provider, api_key: apiKey },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eld_connections"] });
      toast({ title: tNow("eld.toastConnected") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDisconnectEld() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("eld_connections")
        .update({ status: "disconnected", api_key: null })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eld_connections"] });
      toast({ title: tNow("eld.toastDisconnected") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useSyncEldNow() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("eld-sync", {
        body: { org_id: currentOrg?.id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eld_connections"] });
      queryClient.invalidateQueries({ queryKey: ["eld_sync_log"] });
      toast({ title: tNow("eld.toastSynced") });
    },
    onError: (e: Error) => toast({ title: tNow("eld.toastSyncFailed"), description: e.message, variant: "destructive" }),
  });
}

// ── ELD driver matching ──────────────────────────────────────────────────────
// eld-sync records ELD driver identities it couldn't map to a local driver in
// eld_driver_matches. The Drivers hub lists the unmatched ones and lets the
// operator link them to an existing driver, create a new one, or ignore them.
export interface EldDriverMatch {
  id: string;
  org_id: string;
  provider: EldProvider;
  external_key: string;
  external_email: string | null;
  external_name: string | null;
  driver_id: string | null;
  status: "unmatched" | "linked" | "ignored";
  violations_pending: number;
  last_seen_at: string;
}

export function useEldDriverMatches() {
  return useQuery({
    queryKey: ["eld_driver_matches", "unmatched"],
    queryFn: async () => {
      const { data, error } = await db
        .from("eld_driver_matches")
        .select("id, org_id, provider, external_key, external_email, external_name, driver_id, status, violations_pending, last_seen_at")
        .eq("status", "unmatched")
        .order("last_seen_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as EldDriverMatch[];
    },
  });
}

export function useLinkEldMatch() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, driverId, provider }: { id: string; driverId: string; provider: EldProvider }) => {
      const { error } = await db
        .from("eld_driver_matches")
        .update({ driver_id: driverId, status: "linked", violations_pending: 0 })
        .eq("id", id);
      if (error) throw new Error(error.message);
      // Force the next sync to re-pull the default window so this driver's
      // previously-skipped violations are imported (dedup keeps it safe).
      if (currentOrg?.id) {
        await db
          .from("eld_connections")
          .update({ last_sync_at: null })
          .eq("org_id", currentOrg.id)
          .eq("provider", provider);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eld_driver_matches"] });
      toast({ title: tNow("eldMatch.toastLinked") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useIgnoreEldMatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("eld_driver_matches").update({ status: "ignored" }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eld_driver_matches"] });
      toast({ title: tNow("eldMatch.toastIgnored") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}
