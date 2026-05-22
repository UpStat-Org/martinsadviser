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
      const { error } = await db.from("eld_connections").upsert(
        {
          org_id: currentOrg?.id,
          provider,
          api_key: apiKey,
          status: "connected",
          last_error: null,
        },
        { onConflict: "org_id,provider" },
      );
      if (error) throw new Error(error.message);
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
