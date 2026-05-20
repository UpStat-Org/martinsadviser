import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { tNow } from "@/lib/translations";
import { useOrg } from "@/contexts/OrgContext";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  entity_id: string | null;
  read: boolean;
  created_at: string;
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const query = useQuery({
    queryKey: ["notifications", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as Notification[];
    },
    enabled: !!orgId,
  });

  // Realtime subscription scoped to the current org. RLS already prevents
  // cross-org reads via REST, but realtime postgres_changes publishes without
  // RLS — filtering server-side keeps WS noise (and refetches) inside the tenant.
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`notifications-realtime-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `org_id=eq.${orgId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", orgId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, orgId]);

  const unreadCount = query.data?.filter((n) => !n.read).length ?? 0;

  return { ...query, unreadCount };
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(tNow("toast.authRequired"));
      const { error } = await supabase
        .from("notifications")
        .update({ read: true } as any)
        .eq("user_id", user.id)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
