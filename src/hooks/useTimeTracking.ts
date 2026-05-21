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

export interface TimeEntry {
  id: string;
  org_id: string;
  task_id: string;
  user_id: string;
  client_id: string | null;
  minutes: number;
  note: string | null;
  logged_at: string;
  created_at: string;
}

export type TimeEntryInsert = Omit<TimeEntry, "id" | "org_id" | "created_at">;

export function useTimeEntries(filter: { taskId?: string; clientId?: string }) {
  return useQuery({
    queryKey: ["time_entries", filter],
    enabled: !!(filter.taskId || filter.clientId),
    queryFn: async () => {
      let q = db.from("task_time_entries").select("*");
      if (filter.taskId) q = q.eq("task_id", filter.taskId);
      if (filter.clientId) q = q.eq("client_id", filter.clientId);
      const { data, error } = await q.order("logged_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as TimeEntry[];
    },
  });
}

export function useAllTimeEntries() {
  return useQuery({
    queryKey: ["time_entries", "all"],
    queryFn: async () => {
      const { data, error } = await db.from("task_time_entries").select("*");
      if (error) throw new Error(error.message);
      return (data ?? []) as TimeEntry[];
    },
  });
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: TimeEntryInsert) => {
      const { data, error } = await db.from("task_time_entries").insert(input).select().single();
      if (error) throw new Error(error.message);
      return data as TimeEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      toast({ title: tNow("timeTracking.toastLogged") });
    },
    onError: (e: Error) => toast({ title: tNow("common.error"), description: e.message, variant: "destructive" }),
  });
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("task_time_entries").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["time_entries"] }),
  });
}
