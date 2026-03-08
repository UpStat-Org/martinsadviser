import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityLog {
  id: string;
  user_id: string;
  client_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  details: Record<string, any>;
  created_at: string;
}

export function useActivityLog(clientId?: string, limit = 50) {
  return useQuery({
    queryKey: ["activity_log", clientId, limit],
    queryFn: async () => {
      let query = supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ActivityLog[];
    },
  });
}
